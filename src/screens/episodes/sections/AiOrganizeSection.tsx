import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { SelectField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { aiAnalyzeEpisodes, type AiAnalyzeResult } from '../../../features/ai/analyze';
import { useAiStatus } from '../../../features/ai/aiStatus';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { refreshWorkData, useWorkData } from '../../../features/works/workData';
import s from './episodes.module.css';

/**
 * 이미 올린 회차를 AI로 (다시) 정리. 범위(시작~끝 회차)를 고르고 확인 후 회차 순서대로.
 * 원고 본문·기존 항목·작가 요약은 바꾸지 않고, 새로 찾은 것만 "AI 추정"으로 더한다(서버 analyze-episode).
 */
export function AiOrganizeSection({ workId, single }: { workId: string; single?: number }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const eps = data ? [...data.episodes].sort((a, b) => a.no - b.no) : [];
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'running'>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<AiAnalyzeResult[] | null>(null);
  const [stopping, setStopping] = useState(false);
  const stopRef = useRef(false);
  if (!data || eps.length === 0 || !canWrite || !ai.on) return null;

  const lo = single ?? from ?? eps[0].no;
  const hi = single ?? to ?? eps[eps.length - 1].no;
  const chosen = eps.filter((e) => e.no >= Math.min(lo, hi) && e.no <= Math.max(lo, hi));
  const st = ai.status;
  const left = st?.usage ? Math.max(0, st.limits.text - st.usage.text) : null;

  const run = async () => {
    setPhase('running');
    setResults(null);
    stopRef.current = false;
    setStopping(false);
    const r = await aiAnalyzeEpisodes(
      workId,
      chosen.map((e) => ({ id: e.id, no: e.no })),
      (done, total, no) => setProgress(copy.ai.analyzing(done, total, no)),
      () => stopRef.current,
    );
    setResults(r);
    setProgress(null);
    setPhase('idle');
    refreshWorkData(workId);
  };

  const ok = results?.filter((r) => r.ok) ?? [];
  const found = ok.reduce((n, r) => n + r.found, 0);
  const options: [string, string][] = eps.map((e) => [String(e.no), copy.organize.epLabel(e.no, e.title)]);

  const body = (
    <>
      {single == null && (
        <>
          <p className={s.muted}>{copy.organize.lead}</p>
          <p className={s.muted}>{copy.organize.safe}</p>
          <div className={s.organizeRange}>
            <SelectField label={copy.organize.from} value={String(lo)} onChange={(e) => setFrom(Number(e.target.value))} options={options} disabled={phase === 'running'} />
            <SelectField label={copy.organize.to} value={String(hi)} onChange={(e) => setTo(Number(e.target.value))} options={options} disabled={phase === 'running'} />
          </div>
        </>
      )}
      <p className={s.muted}>
        {copy.organize.cost(chosen.length)}
        {left != null && copy.organize.left(left)}
        {' · '}
        {copy.organize.notice}
      </p>
      {left != null && chosen.length > left && <p className={s.error}>{copy.organize.overLimit(left)}</p>}
      {phase === 'confirm' ? (
        <ConfirmBar
          message={copy.organize.confirm(chosen.length)}
          confirmLabel={copy.organize.confirmYes}
          cancelLabel={copy.organize.cancel}
          danger={false}
          onCancel={() => setPhase('idle')}
          onConfirm={run}
        />
      ) : phase === 'running' ? (
        <div className={s.formActions}>
          <span role="status">{stopping ? copy.organize.stopping : progress}</span>
          {chosen.length > 1 && (
            <Button variant="ghost" size="sm" disabled={stopping} onClick={() => { stopRef.current = true; setStopping(true); }}>
              {copy.organize.stop}
            </Button>
          )}
        </div>
      ) : (
        <div>
          <Button variant={single == null ? 'primary' : 'ghost'} size="sm" onClick={() => setPhase('confirm')} disabled={chosen.length === 0 || left === 0}>
            {single == null ? copy.organize.run : copy.organize.one}
          </Button>
        </div>
      )}
      {results && (
        <div role="status" className={s.organizeResult}>
          <strong>{copy.organize.done(ok.length, chosen.length, found)}</strong>
          {ok.length > 0 && found === 0 && <p className={s.muted}>{copy.organize.nothing}</p>}
          <ul>
            {results.map((r) => (
              <li key={r.episodeId} className={r.ok ? s.muted : s.error}>
                {r.ok && r.counts ? copy.organize.detail(r.no, r.counts) : copy.organize.failed(r.no, r.error ?? '')}
              </li>
            ))}
          </ul>
          {found > 0 && <Link to={`/w/${workId}/review`}>{copy.organize.toReview} →</Link>}
        </div>
      )}
    </>
  );

  return single == null ? (
    <Card title={copy.organize.title} id="organize">
      {body}
    </Card>
  ) : (
    <div className={s.organizeOne}>{body}</div>
  );
}
