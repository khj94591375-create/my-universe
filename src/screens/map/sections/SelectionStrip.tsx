import { StarShape } from '../../../components/StarShape';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

/** 지도 아래 선택 띠: 패널과 같은 선택 상태(빼기 · 전체 해제). 많으면 가로로 넘겨 본다 */
export function SelectionStrip({ workId, selected, onRemove, onClear }: { workId: string; selected: string[]; onRemove: (id: string) => void; onClear: () => void }) {
  const { data } = useWorkData(workId);
  if (!data) return null;
  const items = selected.map((id) => data.itemById.get(id)).filter((i) => i != null);
  return (
    <div className={s.strip} role="group" aria-label={copy.map.stripLabel}>
      {items.length === 0 ? (
        <span className={s.stripHint}>{copy.map.stripNone}</span>
      ) : (
        <>
          <strong className={s.stripCount}>{copy.map.stripCount(items.length)}</strong>
          <ul className={s.stripList}>
            {items.map((i) => (
              <li key={i.id} className={s.stripChip}>
                <StarShape kind={i.kind} size={12} />
                <span title={i.name}>{i.name}</span>
                <button type="button" onClick={() => onRemove(i.id)} aria-label={copy.map.stripRemove(i.name)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={s.stripClear} onClick={onClear}>
            {copy.map.stripClear}
          </button>
        </>
      )}
    </div>
  );
}
