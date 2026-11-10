import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EvidenceQuote } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import { callAi, type StyleResult } from '../../../data/ai';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { styleStats } from '../../../features/style/stats';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './episodes.module.css';

/** 문체 분석: 브라우저 안 통계(전송 없음) + 선택하면 AI 특징(예시가 원고에 있는 것만, 저장 안 함). */
export function StyleSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const bodies = useMemo(() => (data ? data.episodes.map((e) => e.body).filter((b) => b.trim()) : []), [data]);
  const st = useMemo(() => (bodies.length ? styleStats(bodies) : null), [bodies]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StyleResult | null>(null);
  if (!data) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await callAi<StyleResult>('analyze-style', { workId }));
    } catch (e) {
      setError(aiErrorMessage(e));
    }
    setBusy(false);
    refreshAiStatus();
  };
  const list = (xs: { text: string; count: number }[]) => (xs.length ? xs.map((x) => copy.style.count(x.text, x.count)).join(' · ') : copy.style.none);

  return (
    <Card title={copy.style.title} id="style">
      <p className={s.muted}>{copy.style.lead}</p>
      {!st ? (
        <p className={s.muted}>{copy.style.empty}</p>
      ) : (
        <>
          <p className={s.muted}>{copy.style.basis(bodies.length, st.chars)}</p>
          <dl className={s.styleGrid}>
            <div>
              <dt>{copy.style.avgSentence}</dt>
              <dd>{copy.style.chars(st.avgSentence)}</dd>
            </div>
            <div>
              <dt>{copy.style.dialogue}</dt>
              <dd>{copy.style.pct(st.dialogueRatio)}</dd>
            </div>
            <div>
              <dt>{copy.style.avgParagraph}</dt>
              <dd>{copy.style.chars(st.avgParagraph)}</dd>
            </div>
            <div>
              <dt>{copy.style.tense}</dt>
              <dd>{copy.style.tenseText(st.tense.past, st.tense.present)}</dd>
            </div>
            <div className={s.styleWide}>
              <dt>{copy.style.marks}</dt>
              <dd>{copy.style.marksText(st.marks)}</dd>
            </div>
            <div className={s.styleWide}>
              <dt>{copy.style.endings}</dt>
              <dd>{list(st.endings)}</dd>
            </div>
            <div className={s.styleWide}>
              <dt>{copy.style.words}</dt>
              <dd>{list(st.words)}</dd>
            </div>
            <div className={s.styleWide}>
              <dt>{copy.style.phrases}</dt>
              <dd>{list(st.phrases)}</dd>
            </div>
          </dl>
          <h3 className={s.styleSub}>{copy.style.aiTitle}</h3>
          {!canWrite ? (
            <p className={s.muted}>{copy.style.aiOwnOnly}</p>
          ) : !ai.on ? (
            ai.reason && <p className={s.muted}>{ai.reason}</p>
          ) : (
            <>
              <p className={s.muted}>{copy.style.aiNotice}</p>
              <div>
                <Button variant="ghost" size="sm" onClick={run} loading={busy}>
                  {busy ? copy.style.aiRunning : copy.style.aiRun}
                </Button>
              </div>
            </>
          )}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {result && (
            <div aria-live="polite" className={s.styleTraits}>
              <p className={s.muted}>{copy.style.aiBasis(result.episodes, result.sampleChars)}</p>
              {result.traits.length === 0 ? (
                <p className={s.muted}>{copy.style.aiNone}</p>
              ) : (
                <ul className={s.styleTraitList}>
                  {result.traits.map((t) => (
                    <li key={t.name}>
                      <strong>{t.name}</strong>
                      <p>{t.description}</p>
                      {t.examples.map((ex) => (
                        <EvidenceQuote key={ex} text={ex} />
                      ))}
                    </li>
                  ))}
                </ul>
              )}
              {result.dropped > 0 && <p className={s.muted}>{copy.style.aiDropped(result.dropped)}</p>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
