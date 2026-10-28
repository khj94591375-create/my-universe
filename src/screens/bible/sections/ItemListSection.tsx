import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { copy } from '../../../config/copy';
import type { ItemKind } from '../../../data/types';
import { useWorkData } from '../../../features/works/workData';
import { ItemRow } from './ItemRow';
import s from './bible.module.css';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];

/** 종류별 항목 목록. */
export function ItemListSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  if (!data) return null;
  if (data.items.length === 0) return <EmptyState title={copy.bible.empty} />;
  return (
    <>
      {KINDS.map((k) => {
        const items = data.items.filter((i) => i.kind === k).sort((x, y) => x.name.localeCompare(y.name));
        if (items.length === 0) return null;
        return (
          <Card key={k} title={`${copy.labels.kindPlural[k]} · ${copy.bible.count(items.length)}`}>
            <ul className={s.list}>
              {items.map((i) => (
                <ItemRow key={i.id} workId={workId} item={i} />
              ))}
            </ul>
          </Card>
        );
      })}
      <p className={s.muted}>{copy.bible.imageLater}</p>
    </>
  );
}
