/*
 * RAG v1(BUILD_SPEC 8.2). retrieve(workId, query, itemIds) 하나로 감싼다.
 * RAG v2(임베딩)로 바꿀 때는 장면 검색 부분만 바꾸면 된다.
 */
import type { SupabaseClient } from './deps.ts';
import { buildContext, pickScenes, trimItems, type BuiltContext, type CtxItem, type CtxScene } from './context.ts';

type Row = Record<string, unknown>;

export type WorkSnapshot = {
  items: CtxItem[];
  episodes: { id: string; no: number; title: string | null; summary: string | null }[];
  appearances: { item_id: string; episode_id: string; chunk_id: string | null }[];
  links: { a: string; b: string }[];
};

/** 작품의 설정집·회차·등장·연결을 한 번에 읽고 처음·마지막 등장과 gap을 계산한다. */
export async function loadSnapshot(admin: SupabaseClient, workId: string): Promise<WorkSnapshot> {
  const [items, episodes, apps, links] = await Promise.all([
    admin.from('items').select('id, kind, name, note, status, item_aliases(alias)').eq('work_id', workId),
    admin.from('episodes').select('id, no, title, summary').eq('work_id', workId).order('no'),
    admin.from('appearances').select('item_id, episode_id, chunk_id, items!inner(work_id)').eq('items.work_id', workId),
    admin.from('links').select('a, b').eq('work_id', workId),
  ]);
  for (const r of [items, episodes, apps, links]) if (r.error) throw r.error;
  const eps = (episodes.data ?? []) as WorkSnapshot['episodes'];
  const epNo = new Map(eps.map((e) => [e.id, e.no]));
  const next = (eps.length ? Math.max(...eps.map((e) => e.no)) : 0) + 1;
  const range = new Map<string, [number, number]>();
  for (const a of (apps.data ?? []) as Row[]) {
    const no = epNo.get(a.episode_id as string);
    if (no == null) continue;
    const r = range.get(a.item_id as string) ?? [no, no];
    range.set(a.item_id as string, [Math.min(r[0], no), Math.max(r[1], no)]);
  }
  return {
    items: ((items.data ?? []) as Row[]).map((i) => {
      const r = range.get(i.id as string);
      return {
        id: i.id as string,
        kind: i.kind as CtxItem['kind'],
        name: i.name as string,
        aliases: ((i.item_aliases ?? []) as { alias: string }[]).map((x) => x.alias),
        note: (i.note as string) ?? null,
        status: i.status as string,
        first_ep: r?.[0] ?? null,
        last_ep: r?.[1] ?? null,
        gap: r ? next - r[1] : null,
      };
    }),
    episodes: eps,
    appearances: ((apps.data ?? []) as Row[]).map((a) => ({ item_id: a.item_id as string, episode_id: a.episode_id as string, chunk_id: (a.chunk_id as string) ?? null })),
    links: (links.data ?? []) as WorkSnapshot['links'],
  };
}

async function chunksByIds(admin: SupabaseClient, ids: string[], epNo: Map<string, number>): Promise<CtxScene[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin.from('chunks').select('id, episode_id, seq, text').in('id', ids);
  if (error) throw error;
  const byId = new Map(((data ?? []) as Row[]).map((c) => [c.id as string, c]));
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is Row => Boolean(c))
    .map((c) => ({ ep: epNo.get(c.episode_id as string) ?? 0, seq: c.seq as number, text: c.text as string }));
}

/** 설정집 요약 + 회차 요약(최근 5개 + 선택 항목이 나온 회차) + 장면(선택 항목 등장 → 비슷한 장면) */
export async function retrieve(admin: SupabaseClient, workId: string, query: string, itemIds: string[], snap?: WorkSnapshot): Promise<BuiltContext> {
  const s = snap ?? (await loadSnapshot(admin, workId));
  const focus = new Set(itemIds);
  const linked = new Set(s.links.flatMap((l) => (focus.has(l.a) ? [l.b] : focus.has(l.b) ? [l.a] : [])));
  const epNo = new Map(s.episodes.map((e) => [e.id, e.no]));

  const focusEps = new Set(s.appearances.filter((a) => focus.has(a.item_id)).map((a) => a.episode_id));
  const recent = s.episodes.slice(-5);
  const summaries = s.episodes.filter((e) => recent.includes(e) || focusEps.has(e.id));

  // 선택 항목이 나온 장면: 최근 회차부터
  const focusChunks = s.appearances
    .filter((a) => focus.has(a.item_id) && a.chunk_id)
    .sort((x, y) => (epNo.get(y.episode_id) ?? 0) - (epNo.get(x.episode_id) ?? 0))
    .map((a) => a.chunk_id as string);
  let scenes = await chunksByIds(admin, [...new Set(focusChunks)].slice(0, 16), epNo);
  // 부족하면 질문과 비슷한 장면을 더한다(pg_trgm)
  if (scenes.length < 8 && query.trim()) {
    const { data } = await admin.rpc('search_chunks', { wid: workId, q: query, lim: 8 });
    scenes = scenes.concat(((data ?? []) as Row[]).map((c) => ({ ep: epNo.get(c.episode_id as string) ?? 0, seq: c.seq as number, text: c.text as string })));
  }
  return buildContext(trimItems(s.items, focus, linked), summaries, pickScenes(scenes));
}
