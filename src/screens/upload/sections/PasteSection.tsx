import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { WriteButton } from '../../../components/WriteButton';
import { TextArea, TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { savePastedEpisode } from '../../../features/analysis/runRules';
import { callAi, type SplitResult } from '../../../data/ai';
import { scenesOf } from '../../../features/manuscript/parse';
import { save } from '../../../features/works/save';
import { useWorkData } from '../../../features/works/workData';
import { startAnalyze } from '../../../features/ai/analyzeTracker';
import { aiReady, useAiStatus } from '../../../features/ai/aiStatus';
import s from './upload.module.css';

/** 붙여 넣기: 회차 번호, 제목, 본문 → 저장 → 규칙 정리(장면 나누기, 재등장, 연결선). */
export function PasteSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  const [no, setNo] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const ai = useAiStatus();

  // 회차 번호 기본값 = 다음 회차
  useEffect(() => {
    if (data && !no) setNo(String(data.next));
  }, [data, no]);

  const n = Number(no);
  const run = async (overwrite: boolean) => {
    if (!data) return;
    setBusy(true);
    setConfirm(false);
    // AI 켜짐 여부를 확실히 안 다음에 시작(불러오는 중이라 조용히 건너뛰지 않게)
    const aiOn = await aiReady();
    let saved: { id: string; no: number } | null = null;
    const ok = await save(
      workId,
      async () => {
        // AI가 켜져 있으면 문맥으로 장면을 나눈다(회차 하나이므로 AI가 고른 회차 경계도 장면 경계로). 실패하면 규칙으로
        const text = body.replace(/\r\n?/g, '\n').trim();
        let scenes: string[] | undefined;
        if (aiOn) {
          try {
            const r = await callAi<SplitResult>('split-episodes', { workId, text });
            const cuts = r.starts.flatMap((st, k) => [...(k > 0 ? [st.line] : []), ...(st.scenes ?? [])]);
            scenes = scenesOf(text, cuts);
          } catch {
            scenes = undefined;
          }
        }
        const ep = await savePastedEpisode(workId, { no: n, title, body: text, scenes }, data.items, overwrite);
        saved = { id: ep.id, no: ep.no };
      },
      aiOn ? copy.upload.savedAi(1) : copy.upload.savedNoAi(1),
    );
    // AI 정리는 뒤에서 계속(검토 화면이 "AI 정리 중"과 결과를 보여 준다)
    if (ok && saved && aiOn) void startAnalyze(workId, [saved]).catch(() => undefined);
    setBusy(false);
    if (ok) nav(`/w/${workId}/review?eps=${n}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!Number.isInteger(n) || n < 1) return setError(copy.upload.noRequired);
    if (!body.trim()) return setError(copy.upload.bodyRequired);
    if (data?.episodes.some((ep) => ep.no === n)) return setConfirm(true);
    run(false);
  };

  return (
    <Card>
      <form className={s.form} onSubmit={submit}>
        <div className={s.row}>
          <div className={s.no}>
            <TextField label={copy.upload.no} type="number" min={1} inputMode="numeric" value={no} onChange={(e) => setNo(e.target.value)} />
          </div>
          <TextField label={copy.upload.titleLabel} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </div>
        <TextArea label={copy.upload.body} placeholder={copy.upload.bodyPlaceholder} value={body} onChange={(e) => setBody(e.target.value)} rows={14} />
        <p className={s.muted}>
          {copy.upload.count(body.replace(/\n/g, '').length)} · {ai.on ? copy.upload.aiNotice : copy.upload.aiNoticeOff}
        </p>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {confirm ? (
          <ConfirmBar message={copy.upload.exists(n)} confirmLabel={copy.upload.overwrite} cancelLabel={copy.upload.skip} onConfirm={() => run(true)} onCancel={() => setConfirm(false)} />
        ) : (
          <div className={s.actions}>
            <WriteButton workId={workId} type="submit" variant="accent" loading={busy}>
              {busy ? copy.upload.saving : copy.upload.submit}
            </WriteButton>
          </div>
        )}
      </form>
    </Card>
  );
}
