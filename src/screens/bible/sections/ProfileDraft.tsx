import { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { EvidenceQuote } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import { callAi, type ProfileResult } from '../../../data/ai';
import type { ItemView } from '../../../data/types';
import { aiErrorMessage, refreshAiStatus } from '../../../features/ai/aiStatus';
import s from './bible.module.css';

const FIELDS = ['look', 'personality', 'speech'] as const;

/** 인물 소개 AI 초안: 근거와 함께 보여 주고, "옮기기"를 눌러야 고치기 칸에 들어간다(저장은 작가가). */
export function ProfileDraft({ workId, item, onUse, onClose }: { workId: string; item: ItemView; onUse: (p: ProfileResult) => void; onClose: () => void }) {
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    let alive = true;
    callAi<ProfileResult>('profile-item', { workId, itemId: item.id }).then(
      (r) => alive && setResult(r),
      (e) => alive && setError(aiErrorMessage(e)),
    ).finally(() => refreshAiStatus());
    return () => {
      alive = false;
    };
  }, [workId, item.id, started]);

  const empty = result && FIELDS.every((f) => !result[f].text);
  return (
    <section className={s.profile} aria-live="polite" aria-label={copy.profile.title(item.name)}>
      <strong>{copy.profile.title(item.name)}</strong>
      {!started && <p className={s.muted}>{copy.profile.notice}</p>}
      {started && !result && !error && <p className={s.muted}>{copy.profile.running}</p>}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {result && empty && <p className={s.muted}>{copy.profile.empty}</p>}
      {result && !empty && (
        <dl className={s.profileList}>
          {FIELDS.map((f) => (
            <div key={f}>
              <dt>{copy.profile.fields[f]}</dt>
              <dd>
                {result[f].text ? <p>{result[f].text}</p> : <p className={s.muted}>{copy.profile.unknown}</p>}
                {result[f].evidence.map((ev) => (
                  <EvidenceQuote key={`${ev.tag}-${ev.text}`} text={ev.text} ep={ev.ep} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {result && result.dropped > 0 && <p className={s.muted}>{copy.profile.dropped(result.dropped)}</p>}
      {result && !empty && <p className={s.muted}>{copy.profile.useHint}</p>}
      <div className={s.formActions}>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {copy.profile.close}
        </Button>
        {!started && (
          <Button size="sm" onClick={() => setStarted(true)}>
            {copy.profile.start}
          </Button>
        )}
        {result && !empty && (
          <Button size="sm" onClick={() => onUse(result)}>
            {copy.profile.use}
          </Button>
        )}
      </div>
    </section>
  );
}
