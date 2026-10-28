import { useState, type ReactNode } from 'react';
import { AiBadge, GapTag, KindTag, StatusTag } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import type { ItemKind, ItemStatus, ItemView } from '../../../data/types';
import { reuseScore } from '../../../features/foreshadow/reuse';
import { useWorkData, type WorkData } from '../../../features/works/workData';
import s from './forgot.module.css';

const STATUSES: ItemStatus[] = ['open', 'resolved', 'reuse_planned', 'reused'];
const KINDS: ItemKind[] = ['foreshadow', 'character', 'setting'];

/** 연결된 항목들(연결선 기준). */
export function linkedItems(data: WorkData, id: string): ItemView[] {
  const ids = new Set<string>();
  for (const l of data.links) {
    if (l.a === id) ids.add(l.b);
    if (l.b === id) ids.add(l.a);
  }
  return [...ids].map((x) => data.itemById.get(x)).filter((x): x is ItemView => Boolean(x));
}

export function reuseOf(data: WorkData, item: ItemView) {
  return reuseScore(data.latest, linkedItems(data, item.id).map((l) => ({ name: l.name, lastEp: l.last_ep })));
}

const reuseTone = { high: 'ok', mid: 'info', low: 'neutral' } as const;

/** 상태·종류 필터 + 항목 카드 목록(오래 잊힌 순). */
export function ForgotListSection({ workId, selectedId, onSelect }: { workId: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { data } = useWorkData(workId);
  const [status, setStatus] = useState<ItemStatus | 'all'>('all');
  const [kind, setKind] = useState<ItemKind | 'all'>('all');
  if (!data) return null;

  const byKind = data.items.filter((i) => kind === 'all' || i.kind === kind);
  const list = byKind
    .filter((i) => status === 'all' || i.status === status)
    .sort((x, y) => (y.gap ?? -1) - (x.gap ?? -1) || x.name.localeCompare(y.name));

  return (
    <div className={s.listWrap}>
      <div className={s.filters} role="group" aria-label={copy.forgot.statusFilter}>
        <FilterButton active={status === 'all'} onClick={() => setStatus('all')}>
          {copy.forgot.all} {byKind.length}
        </FilterButton>
        {STATUSES.map((st) => (
          <FilterButton key={st} active={status === st} onClick={() => setStatus(st)}>
            {copy.labels.status[st]} {byKind.filter((i) => i.status === st).length}
          </FilterButton>
        ))}
      </div>
      <div className={s.filters} role="group" aria-label={copy.forgot.kindFilter}>
        <FilterButton active={kind === 'all'} onClick={() => setKind('all')}>
          {copy.forgot.all}
        </FilterButton>
        {KINDS.map((k) => (
          <FilterButton key={k} active={kind === k} onClick={() => setKind(k)}>
            {copy.labels.kind[k]}
          </FilterButton>
        ))}
      </div>
      {list.length === 0 && <p className={s.muted}>{copy.forgot.noMatch}</p>}
      <ul className={s.cards}>
        {list.map((i) => {
          const reuse = i.status === 'resolved' && i.kind === 'foreshadow' ? reuseOf(data, i) : null;
          return (
            <li key={i.id}>
              <button type="button" className={i.id === selectedId ? `${s.card} ${s.selected}` : s.card} onClick={() => onSelect(i.id)} aria-pressed={i.id === selectedId}>
                <span className={s.cardHead}>
                  <strong>{i.name}</strong>
                  <KindTag kind={i.kind} />
                  {(i.source === 'ai' || !i.confirmed) && <AiBadge />}
                </span>
                <span className={s.cardMeta}>
                  {i.first_ep != null && i.last_ep != null ? copy.labels.epRange(i.first_ep, i.last_ep) : copy.labels.noAppearance}
                </span>
                <span className={s.cardTags}>
                  <GapTag gap={i.gap} />
                  <StatusTag status={i.status} />
                  {reuse && (
                    <Tag tone={reuseTone[reuse.level]}>
                      {copy.forgot.reuseTitle} {reuse.label}
                    </Tag>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={active ? `${s.filter} ${s.filterOn}` : s.filter} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
