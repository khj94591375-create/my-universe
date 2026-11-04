import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EvidenceQuote } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { callAi } from '../../../data/ai';
import { setIssueStatus } from '../../../data/items';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { refreshWorkData, useWorkData } from '../../../features/works/workData';
import s from './bible.module.css';

/** 설정 충돌 목록(BUILD_SPEC 6.8, 7.9): 근거 두 개, 무시 / 수정함, 설정 충돌 검사(AI). */
export function ConflictSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [checking, setChecking] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const loc = useLocation();
  // 홈의 "설정 충돌 보기"(#conflicts)로 오면 이 칸으로 내려온다
  const ready = Boolean(data);
  useEffect(() => {
    if (!ready || loc.hash !== '#conflicts') return;
    // 항목 목록이 그려진 다음에 내려간다
    const t = setTimeout(() => document.getElementById('conflicts')?.scrollIntoView({ block: 'start' }), 100);
    return () => clearTimeout(t);
  }, [ready, loc.hash]);
  if (!data) return null;

  const open = data.issues.filter((i) => i.status === 'open');
  const closed = data.issues.filter((i) => i.status !== 'open');
  const list = showClosed ? data.issues : open;

  const check = async () => {
    setChecking(true);
    try {
      const r = await callAi<{ saved: number }>('check-consistency', { workId });
      showToast(copy.bible.conflictResult(r.saved));
      refreshWorkData(workId);
    } catch (e) {
      showToast(aiErrorMessage(e), 'error');
    }
    setChecking(false);
    refreshAiStatus();
  };

  return (
    <Card title={copy.bible.conflictTitle} id="conflicts">
      <div className={s.conflictHead}>
        <p className={s.muted}>{copy.bible.conflictHint}</p>
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={check} loading={checking} disabled={!ai.on} title={ai.reason ?? undefined}>
            {checking ? copy.bible.conflictChecking : copy.bible.conflictCheck}
          </Button>
        )}
      </div>
      {canWrite && !ai.on && ai.reason && <p className={s.muted}>{ai.reason}</p>}
      {list.length === 0 ? (
        <p className={s.muted}>{copy.bible.conflictNone}</p>
      ) : (
        <ul className={s.list}>
          {list.map((i) => {
            const item = i.item_id ? data.itemById.get(i.item_id) : null;
            return (
              <li key={i.id} className={s.row}>
                <div className={s.head}>
                  {item && <strong>{copy.bible.conflictItem(item.name)}</strong>}
                  <span>{i.description}</span>
                  <Tag tone={i.status === 'open' ? 'warn' : 'neutral'}>{copy.bible.conflictStatus[i.status]}</Tag>
                </div>
                <div className={s.conflictPair}>
                  <EvidenceQuote text={i.evidence_a} ep={i.episode_a} />
                  <EvidenceQuote text={i.evidence_b} ep={i.episode_b} />
                </div>
                {canWrite && (
                  <div className={s.rowActions}>
                    {i.status === 'open' ? (
                      <>
                        <Button size="sm" onClick={() => save(workId, () => setIssueStatus(i.id, 'fixed'))}>
                          {copy.bible.conflictFixed}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => save(workId, () => setIssueStatus(i.id, 'ignored'))}>
                          {copy.bible.conflictIgnore}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => save(workId, () => setIssueStatus(i.id, 'open'))}>
                        {copy.bible.conflictReopen}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {closed.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? copy.bible.hideClosed : `${copy.bible.showClosed} (${copy.bible.conflictClosed(closed.length)})`}
        </Button>
      )}
    </Card>
  );
}
