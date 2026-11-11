import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { AiBadge, GapTag, KindTag, StatusTag } from '../../../components/Badges';
import { StarShape } from '../../../components/StarShape';
import { copy } from '../../../config/copy';
import { deleteLink, setItemStatus } from '../../../data/items';
import type { ItemView } from '../../../data/types';
import { directionFor } from '../../../features/map/links';
import { episodesOf, linkedOf, linkKindText, relationText } from '../../../features/map/relations';
import { save } from '../../../features/works/save';
import type { WorkData } from '../../../features/works/workData';
import type { MapFocus } from './MapCanvasSection';
import s from './map.module.css';
import { isUnconfirmedAi } from '../../../features/ai/review';

/**
 * 오른쪽 패널 ② 관계 확인: 고른 별 하나의 이름·종류·설명·상태·등장 회차·관련 복선·연결된 항목.
 * 상태는 작가가 정한 값만 확정으로 보여 주고, AI 회수 추정은 "확인 전"으로 따로 보여 준다.
 */
export function StarDetailCard({
  workId,
  data,
  item,
  canWrite,
  open,
  aiResolveEp,
  focus,
  onRemove,
}: {
  workId: string;
  data: WorkData;
  item: ItemView;
  canWrite: boolean;
  open: boolean;
  aiResolveEp: number | null;
  focus: MapFocus;
  onRemove: (id: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const linked = linkedOf(data, item.id);
  const related = [...new Map(linked.filter((x) => x.other.kind === 'foreshadow').map((x) => [x.other.id, x.other])).values()];
  const eps = episodesOf(data, item.id);
  const isAi = isUnconfirmedAi(item);
  const look = (id: string) => {
    focus.setFocusId(id);
    focus.centerOn(id);
  };

  return (
    <details className={s.starCard} open={open} onToggle={(e) => (e.currentTarget.open ? focus.setFocusId(item.id) : undefined)}>
      <summary className={s.starSummary}>
        <StarShape kind={item.kind} size={16} />
        <strong>{item.name}</strong>
        <KindTag kind={item.kind} />
      </summary>
      <div className={s.starBody}>
        <div className={s.infoActions}>
          <Link to={`/w/${workId}/bible?item=${item.id}`}>{copy.map.info.toBible}</Link>
          <Link to={`/w/${workId}/forgot?item=${item.id}`}>{copy.map.info.guide}</Link>
          {canWrite && (
            <Button variant="ghost" size="sm" onClick={() => focus.setLinkFrom(item.id)}>
              {copy.map.info.addLink}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
            {copy.map.info.removeFromPlan}
          </Button>
        </div>
        {item.note ? <p>{item.note}</p> : <p className={s.muted}>{copy.map.panel.noNote}</p>}
        <div className={s.stateRow}>
          {(item.kind === 'foreshadow' || item.status === 'reuse_planned') && <StatusTag status={item.status} />}
          {item.gap != null && <GapTag gap={item.gap} />}
          {isAi && <AiBadge />}
        </div>
        {item.kind === 'foreshadow' && <p className={s.muted}>{copy.map.info.byAuthor}</p>}
        {isAi && <p className={s.note}>{copy.map.info.aiItem}</p>}
        {aiResolveEp != null && (
          <div className={s.note}>
            <p>{copy.map.info.aiResolveNote(aiResolveEp)}</p>
            <div className={s.infoActions}>
              {canWrite && (
                <Button size="sm" onClick={() => save(workId, () => setItemStatus(item.id, 'resolved'))}>
                  {copy.map.info.markResolved}
                </Button>
              )}
              <Link to={`/w/${workId}/review`}>{copy.map.info.toReview}</Link>
            </div>
          </div>
        )}
        <p className={s.muted}>
          {copy.map.info.appears}: {eps.length ? eps.map((n) => `${n}화`).join(', ') : copy.map.info.none}
        </p>
        {item.kind !== 'foreshadow' && (
          <div className={s.muted}>
            {copy.map.info.relatedForeshadow}: {related.length === 0 && copy.map.info.none}
            {related.length > 0 && (
              <span className={s.chips}>
                {related.map((f) => (
                  <button key={f.id} type="button" className={s.textBtn} onClick={() => look(f.id)}>
                    <StarShape kind="foreshadow" size={12} /> {f.name}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}
        <div className={s.muted}>
          {copy.map.info.linked}: {linked.length === 0 && copy.map.info.none}
          {linked.length > 0 && (
            <ul className={s.linkedList}>
              {linked.map(({ link, other }) => {
                const d = directionFor(link, item.id);
                return (
                  <li key={link.id} className={s.linkedItem}>
                    <button
                      type="button"
                      className={`${s.textBtn} ${focus.linkId === link.id ? s.textBtnOn : ''}`}
                      onClick={() => focus.setLinkId(link.id)}
                      aria-pressed={focus.linkId === link.id}
                      aria-label={copy.map.info.openRelation(other.name)}
                    >
                      <span className={s.dir} aria-hidden="true">{d === 'out' ? '→' : d === 'in' ? '←' : '—'}</span>
                      <strong>{other.name}</strong> · {relationText(link)}
                      <span className={s.linkKind}> ({linkKindText(link)})</span>
                    </button>
                    {canWrite && link.kind !== 'co_occur' && (
                      <button type="button" className={s.removeLink} onClick={() => setRemoving(link.id)} aria-label={`${other.name} ${copy.map.info.removeLink}`}>
                        ×
                      </button>
                    )}
                    {removing === link.id && (
                      <ConfirmBar
                        message={copy.map.info.removeLinkConfirm(item.name, other.name)}
                        confirmLabel={copy.map.info.removeYes}
                        cancelLabel={copy.map.info.linkCancel}
                        onCancel={() => setRemoving(null)}
                        onConfirm={async () => {
                          await save(workId, () => deleteLink(link.id), copy.map.info.removed);
                          setRemoving(null);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}
