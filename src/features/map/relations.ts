import { copy } from '../../config/copy';
import type { ItemView, Link } from '../../data/types';
import type { WorkData } from '../works/workData';

/* 별 하나의 관계·등장 회차 계산(지도·오른쪽 패널 공용). 실제 기록된 관계만 쓴다. */

export type Linked = { link: Link; other: ItemView };

/** 이 별과 이어진 항목과 관계(같은 장면 연결선은 이름이 없어 "같은 장면 N번"). */
export function linkedOf(data: Pick<WorkData, 'links' | 'itemById'>, id: string): Linked[] {
  return data.links
    .filter((l) => l.a === id || l.b === id)
    .map((l) => ({ link: l, other: data.itemById.get(l.a === id ? l.b : l.a) }))
    .filter((x): x is Linked => Boolean(x.other));
}

/** 이 별이 나온 회차 번호(오름차순). */
export function episodesOf(data: Pick<WorkData, 'appearances' | 'episodes'>, itemId: string): number[] {
  const no = new Map(data.episodes.map((e) => [e.id, e.no]));
  return [...new Set(data.appearances.filter((a) => a.item_id === itemId).map((a) => no.get(a.episode_id)))].filter((n): n is number => n != null).sort((a, b) => a - b);
}

/** 고른 별끼리 실제로 이어진 관계. */
export function linksAmong(links: Link[], ids: string[]): Link[] {
  const set = new Set(ids);
  return links.filter((l) => set.has(l.a) && set.has(l.b));
}

export function linkKindText(l: Pick<Link, 'kind'>): string {
  return l.kind === 'ai' ? copy.labels.ai : l.kind === 'manual' ? copy.map.legendManual : copy.map.info.autoLink;
}

export function relationText(l: Pick<Link, 'kind' | 'label' | 'weight'>): string {
  return l.label ?? (l.kind === 'co_occur' ? copy.map.info.coTimes(l.weight) : copy.map.info.noLabel);
}
