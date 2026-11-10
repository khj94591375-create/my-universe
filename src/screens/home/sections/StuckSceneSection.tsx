import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EvidenceQuote } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { TextArea } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { callAi, type UnstickResult } from '../../../data/ai';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import s from './sections.module.css';

/** 막힌 장면 풀기: 상황을 적으면 방향이 다른 대안 3개(플롯 수준, 저장 안 함). */
export function StuckSceneSection({ workId }: { workId: string }) {
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnstickResult | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const situation = text.trim();
    if (!situation) return setError(copy.unstick.needText);
    setBusy(true);
    setError(null);
    try {
      setResult(await callAi<UnstickResult>('unstick-scene', { workId, situation }));
    } catch (err) {
      setError(aiErrorMessage(err));
    }
    setBusy(false);
    refreshAiStatus();
  };

  return (
    <Card title={copy.unstick.title} id="unstick">
      <p className={s.note}>{copy.unstick.lead}</p>
      {!canWrite ? (
        <p className={s.placeholder}>{copy.unstick.ownOnly}</p>
      ) : !ai.on ? (
        ai.reason && <p className={s.placeholder}>{ai.reason}</p>
      ) : (
        <form className={s.stuckForm} onSubmit={submit}>
          <TextArea label={copy.unstick.label} placeholder={copy.unstick.placeholder} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1500} />
          <p className={s.note}>{copy.unstick.notice}</p>
          <Button type="submit" loading={busy}>
            {busy ? copy.unstick.running : result ? copy.unstick.again : copy.unstick.run}
          </Button>
        </form>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {result && (
        <div aria-live="polite">
          {result.options.length === 0 ? (
            <p className={s.placeholder}>{copy.unstick.none}</p>
          ) : (
            <ol className={s.list}>
              {result.options.map((o, i) => (
                <li key={`${i}-${o.title}`} className={s.stuckOption}>
                  <div className={s.rowHead}>
                    <Tag tone="info">{copy.unstick.option(i + 1)}</Tag>
                    <strong>{o.title}</strong>
                  </div>
                  <p className={s.suggestion}>{o.plan}</p>
                  {o.uses.length > 0 && (
                    <div className={s.stuckUses}>
                      <span className={s.note}>{copy.unstick.uses}</span>
                      {o.uses.map((u) =>
                        u.evidence ? (
                          <EvidenceQuote key={u.item} text={u.evidence} ep={u.ep}>
                            {' · '}
                            {u.item}
                          </EvidenceQuote>
                        ) : (
                          <p key={u.item} className={s.note}>
                            {u.item} — {copy.unstick.noEvidence}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                  {o.caution && (
                    <p className={s.note}>
                      <Tag tone="warn">{copy.unstick.caution}</Tag> {o.caution}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}
