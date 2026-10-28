import type { Chunk, Episode } from './types';
import { db } from './client';

/* 회차·장면·등장 쓰기 함수(BUILD_SPEC 6.4, 6.9). */

export async function findEpisodeByNo(workId: string, no: number): Promise<Episode | null> {
  const { data, error } = await db().from('episodes').select('*').eq('work_id', workId).eq('no', no).maybeSingle();
  if (error) throw error;
  return data as Episode | null;
}

export async function insertEpisode(workId: string, input: { no: number; title: string | null; body: string; source_file: string }): Promise<Episode> {
  const { data, error } = await db()
    .from('episodes')
    .insert({ work_id: workId, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as Episode;
}

export async function updateEpisode(id: string, patch: Partial<Pick<Episode, 'title' | 'summary' | 'analyzed_at'>>) {
  const { error } = await db().from('episodes').update(patch).eq('id', id);
  if (error) throw error;
}

/** 회차 삭제. 장면·등장 기록은 cascade로 함께 지워진다. */
export async function deleteEpisode(id: string) {
  const { error } = await db().from('episodes').delete().eq('id', id);
  if (error) throw error;
}

/** 회차의 장면을 모두 바꾼다(규칙 등장 기록도 함께 지운다). */
export async function replaceChunks(episode: Pick<Episode, 'id' | 'work_id'>, texts: string[]): Promise<Chunk[]> {
  const c = db();
  const { error: e1 } = await c.from('appearances').delete().eq('episode_id', episode.id).eq('source', 'rule');
  if (e1) throw e1;
  const { error: e2 } = await c.from('chunks').delete().eq('episode_id', episode.id);
  if (e2) throw e2;
  if (texts.length === 0) return [];
  const { data, error } = await c
    .from('chunks')
    .insert(texts.map((text, i) => ({ episode_id: episode.id, work_id: episode.work_id, seq: i + 1, text })))
    .select('*');
  if (error) throw error;
  return (data as Chunk[]).sort((x, y) => x.seq - y.seq);
}

export async function insertAppearances(rows: { item_id: string; episode_id: string; chunk_id: string | null; evidence: string; source: 'rule' | 'manual'; role?: 'mention' }[]) {
  if (rows.length === 0) return;
  const { error } = await db().from('appearances').insert(rows);
  if (error) throw error;
}

/** 등장 기록을 직접 지운다(회차 기록 화면에서 체크 해제). */
export async function deleteAppearances(itemId: string, episodeId: string) {
  const { error } = await db().from('appearances').delete().eq('item_id', itemId).eq('episode_id', episodeId);
  if (error) throw error;
}

/** 작품 전체의 장면 수와, 장면별로 나온 항목들(같은 장면 연결선 계산용). */
export async function fetchChunkItems(workId: string) {
  const c = db();
  const [chunks, apps] = await Promise.all([
    c.from('chunks').select('id', { count: 'exact', head: true }).eq('work_id', workId),
    c.from('appearances').select('item_id, chunk_id, items!inner(work_id)').eq('items.work_id', workId).not('chunk_id', 'is', null),
  ]);
  if (chunks.error) throw chunks.error;
  if (apps.error) throw apps.error;
  const map = new Map<string, Set<string>>();
  for (const a of apps.data ?? []) {
    const set = map.get(a.chunk_id as string) ?? new Set<string>();
    set.add(a.item_id as string);
    map.set(a.chunk_id as string, set);
  }
  return { total: chunks.count ?? 0, map };
}

/** 같은 장면 연결선을 통째로 바꾼다. */
export async function replaceCoOccurLinks(workId: string, pairs: { a: string; b: string; weight: number }[]) {
  const c = db();
  const { error: e1 } = await c.from('links').delete().eq('work_id', workId).eq('kind', 'co_occur');
  if (e1) throw e1;
  if (pairs.length === 0) return;
  const { error } = await c.from('links').insert(pairs.map((p) => ({ work_id: workId, a: p.a, b: p.b, kind: 'co_occur', weight: p.weight })));
  if (error) throw error;
}
