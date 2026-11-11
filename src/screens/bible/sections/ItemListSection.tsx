import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { art } from '../../../config/art';
import type { ItemKind } from '../../../data/types';
import { useWorkData } from '../../../features/works/workData';
import { ItemRow } from './ItemRow';
import s from './bible.module.css';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];
type Filter = ItemKind | 'all';

/** 종류별 항목 목록 + 이름 검색·종류 필터. */
export function ItemListSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Filter>('all');
  // 우주 지도 등에서 ?item=id 로 오면 그 항목으로 이동해 강조한다
  const [params] = useSearchParams();
  const target = params.get('item');
  const ready = Boolean(data);
  useEffect(() => {
    if (!target || !ready) return;
    setQuery('');
    setKind('all');
    const t = window.setTimeout(() => {
      const el = document.getElementById(`item-${target}`);
      document.querySelectorAll('[data-target]').forEach((x) => x.removeAttribute('data-target'));
      el?.setAttribute('data-target', '');
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(t);
  }, [target, ready]);
  if (!data) return null;
  if (data.items.length === 0) return <EmptyState art={art.emptyCollection} title={copy.bible.empty} />;

  const q = query.trim().toLowerCase();
  const matches = data.items.filter(
    (i) => (kind === 'all' || i.kind === kind) && (!q || i.name.toLowerCase().includes(q) || i.aliases.some((a) => a.toLowerCase().includes(q))),
  );
  const filters: [Filter, string][] = [['all', copy.bible.filterAll], ...KINDS.map((k): [Filter, string] => [k, copy.labels.kind[k]])];

  return (
    <>
      <div role="search" aria-label={copy.bible.search} className={s.filterBar}>
        <TextField
          type="search"
          label={copy.bible.search}
          hint={copy.bible.searchHint}
          placeholder={copy.bible.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={s.filterGroup} role="group" aria-labelledby="bible-filter-label">
          <span id="bible-filter-label" className={s.filterLabel}>
            {copy.bible.filterLabel}
          </span>
          <div className={s.filterButtons}>
            {filters.map(([k, label]) => (
              <button key={k} type="button" className={kind === k ? `${s.chip} ${s.chipOn}` : s.chip} aria-pressed={kind === k} onClick={() => setKind(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className={s.muted} role="status">
          {copy.bible.shown(matches.length, data.items.length)}
        </p>
      </div>
      {matches.length === 0 && (
        <EmptyState
          title={copy.bible.noMatch}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setQuery('');
                setKind('all');
              }}
            >
              {copy.bible.clearFilter}
            </Button>
          }
        />
      )}
      {KINDS.map((k) => {
        const items = matches.filter((i) => i.kind === k).sort((x, y) => x.name.localeCompare(y.name));
        if (items.length === 0) return null;
        return (
          <Card key={k} title={`${copy.labels.kindPlural[k]} · ${copy.bible.count(items.length)}`}>
            <p className={s.muted}>{copy.labels.kindHelp[k]}</p>
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
