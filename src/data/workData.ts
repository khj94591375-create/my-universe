import type { Appearance, Episode, Item, Link } from './types';
import { db } from './client';

/*
 * 작품 한 편의 데이터를 한 번에 불러온다. 항목·회차·등장·연결선.
 * 계산(gap 등)은 features/works/workData.ts에서 한다.
 */

export type WorkRaw = {
  items: (Item & { aliases: string[]; aiAliases: string[] })[];
  episodes: Episode[];
  appearances: Appearance[];
  links: Link[];
};

export async function fetchWorkRaw(workId: string): Promise<WorkRaw> {
  const c = db();
  const [items, episodes, appearances, links] = await Promise.all([
    c.from('items').select('*, item_aliases(*)').eq('work_id', workId).order('created_at'),
    c.from('episodes').select('*').eq('work_id', workId).order('no'),
    c
      .from('appearances')
      .select('id, item_id, episode_id, chunk_id, evidence, source, role, items!inner(work_id)')
      .eq('items.work_id', workId),
    c.from('links').select('*').eq('work_id', workId),
  ]);
  for (const r of [items, episodes, appearances, links]) if (r.error) throw r.error;
  return {
    items: (items.data ?? []).map(({ item_aliases, ...i }) => {
      // source 칸은 0004 SQL 뒤에 생긴다. 없으면 모두 작가 입력으로 본다
      const list = (item_aliases ?? []) as { alias: string; source?: string }[];
      return { ...(i as Item), aliases: list.map((a) => a.alias), aiAliases: list.filter((a) => a.source === 'ai').map((a) => a.alias) };
    }),
    episodes: (episodes.data ?? []) as Episode[],
    appearances: (appearances.data ?? []).map(({ items: _w, ...a }) => a as Appearance),
    links: (links.data ?? []) as Link[],
  };
}

export async function fetchChunks(episodeId: string) {
  const { data, error } = await db().from('chunks').select('*').eq('episode_id', episodeId).order('seq');
  if (error) throw error;
  return data as import('./types').Chunk[];
}
