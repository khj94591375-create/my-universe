import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { fetchWorkRaw, type WorkRaw } from '../../data/workData';
import type { Appearance, Episode, ItemView, Link } from '../../data/types';
import { toMessage } from '../../data/errors';
import { gapOf, nextEp } from '../foreshadow/gap';

/*
 * 작품 데이터 저장소. 섹션마다 workId만 넘기면 같은 데이터를 함께 쓴다.
 * 저장한 뒤 refreshWorkData(workId)를 부르면 그 작품을 보는 모든 화면이 새로 고침 없이 바뀐다(BUILD_SPEC 6.3).
 */

type Entry = { raw: WorkRaw | null; error: string | null; loading: boolean; version: number };
const store = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function emit(workId: string) {
  listeners.get(workId)?.forEach((l) => l());
}

function load(workId: string) {
  const prev = store.get(workId);
  store.set(workId, { raw: prev?.raw ?? null, error: null, loading: true, version: (prev?.version ?? 0) + 1 });
  emit(workId);
  fetchWorkRaw(workId).then(
    (raw) => {
      store.set(workId, { raw, error: null, loading: false, version: (store.get(workId)?.version ?? 0) + 1 });
      emit(workId);
    },
    (e) => {
      store.set(workId, { raw: store.get(workId)?.raw ?? null, error: toMessage(e), loading: false, version: (store.get(workId)?.version ?? 0) + 1 });
      emit(workId);
    },
  );
}

/** 저장·삭제 뒤에 부른다. */
export function refreshWorkData(workId: string) {
  load(workId);
}

/** 로그인 사용자가 바뀌면 전부 비운다. */
export function clearWorkData() {
  store.clear();
}

export type WorkData = {
  items: ItemView[];
  itemById: Map<string, ItemView>;
  episodes: Episode[];
  appearances: Appearance[];
  links: Link[];
  /** 다음 회차 번호 */
  next: number;
  /** 가장 최근 회차 번호(없으면 0) */
  latest: number;
};

export function deriveWorkData(raw: WorkRaw): WorkData {
  const epNo = new Map(raw.episodes.map((e) => [e.id, e.no]));
  const next = nextEp(raw.episodes.map((e) => e.no));
  const stats = new Map<string, { first: number; last: number; count: number }>();
  for (const a of raw.appearances) {
    const no = epNo.get(a.episode_id);
    if (no == null) continue;
    const s = stats.get(a.item_id) ?? { first: no, last: no, count: 0 };
    s.first = Math.min(s.first, no);
    s.last = Math.max(s.last, no);
    s.count += 1;
    stats.set(a.item_id, s);
  }
  const items: ItemView[] = raw.items.map((i) => {
    const s = stats.get(i.id);
    const last = s?.last ?? null;
    return { ...i, first_ep: s?.first ?? null, last_ep: last, mention_count: s?.count ?? 0, gap: gapOf(next, last) };
  });
  return {
    items,
    itemById: new Map(items.map((i) => [i.id, i])),
    episodes: raw.episodes,
    appearances: raw.appearances,
    links: raw.links,
    next,
    latest: next - 1,
  };
}

/** 작품 데이터(항목·회차·등장·연결선 + gap 계산). */
export function useWorkData(workId: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const set = listeners.get(workId) ?? new Set();
      set.add(cb);
      listeners.set(workId, set);
      return () => set.delete(cb);
    },
    [workId],
  );
  const entry = useSyncExternalStore(subscribe, () => store.get(workId));
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!store.get(workId)) load(workId);
    setRequested(true);
  }, [workId]);
  const data = useMemo(() => (entry?.raw ? deriveWorkData(entry.raw) : null), [entry?.raw]);
  return {
    data,
    loading: !requested || !entry || (entry.loading && !entry.raw),
    error: entry?.error ?? null,
    reload: () => load(workId),
  };
}
