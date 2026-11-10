import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EvidenceQuote } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { callAi, type AskResult } from '../../../data/ai';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import s from './bible.module.css';

type Entry = { id: number; question: string; result: AskResult };
const MAX_HISTORY = 5;

/** 세계관 질문하기: 원고·설정집에서 찾아 근거와 함께 답(저장하지 않음, 이번 화면에서만 기억). */
export function AskWorldSection({ workId }: { workId: string }) {
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const usable = canWrite && ai.on;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return setError(copy.ask.needText);
    setBusy(true);
    setError(null);
    try {
      const result = await callAi<AskResult>('ask-world', { workId, question: q });
      setEntries((list) => [{ id: Date.now(), question: q, result }, ...list].slice(0, MAX_HISTORY));
      setQuestion('');
    } catch (err) {
      setError(aiErrorMessage(err));
    }
    setBusy(false);
    refreshAiStatus();
  };

  return (
    <Card title={copy.ask.title} id="ask">
      <p className={s.muted}>{copy.ask.lead}</p>
      {!canWrite ? (
        <p className={s.muted}>{copy.ask.ownOnly}</p>
      ) : !ai.on ? (
        ai.reason && <p className={s.muted}>{ai.reason}</p>
      ) : (
        <form className={s.askForm} onSubmit={submit}>
          <TextField label={copy.ask.label} hideLabel placeholder={copy.ask.placeholder} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} hint={copy.ask.notice} />
          <Button type="submit" loading={busy} disabled={!usable}>
            {busy ? copy.ask.running : copy.ask.run}
          </Button>
        </form>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {entries.length > 0 && (
        <section aria-live="polite">
          {entries.length > 1 && <p className={s.muted}>{copy.ask.history}</p>}
          <ul className={s.list}>
            {entries.map(({ id, question: q, result: r }) => {
              const state = !r.found ? 'notFound' : r.evidence.length ? 'verified' : 'noQuote';
              return (
                <li key={id} className={s.row}>
                  <div className={s.head}>
                    <strong>Q. {q}</strong>
                    <Tag tone={state === 'verified' ? 'ok' : state === 'noQuote' ? 'warn' : 'neutral'}>{copy.ask[state]}</Tag>
                  </div>
                  <p className={s.askAnswer}>{r.answer}</p>
                  {state === 'noQuote' && <p className={s.muted}>{copy.ask.noQuoteHint}</p>}
                  {state === 'notFound' && <p className={s.muted}>{copy.ask.notFoundHint}</p>}
                  {r.evidence.map((ev) => (
                    <EvidenceQuote key={`${ev.tag}-${ev.text}`} text={ev.text} ep={ev.ep} />
                  ))}
                  {r.dropped > 0 && <p className={s.muted}>{copy.ask.dropped(r.dropped)}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Card>
  );
}
