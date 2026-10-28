import { db } from './client';
import { deleteWork } from './works';

/* 내 설정(BUILD_SPEC 6.11): 데이터 내보내기, 내 작품 모두 지우기. */

export type ExportFile = {
  app: 'My Universe';
  exported_at: string;
  works: Record<string, unknown>[];
};

/** 내 작품 전부(작품·회차·항목·별칭·등장·연결)를 하나의 JSON으로 모은다. */
export async function exportMyData(userId: string): Promise<ExportFile> {
  const c = db();
  const { data: works, error } = await c.from('works').select('*').eq('owner_id', userId).order('created_at');
  if (error) throw error;
  const out: Record<string, unknown>[] = [];
  for (const w of works ?? []) {
    const [episodes, items, appearances, links] = await Promise.all([
      c.from('episodes').select('no, title, summary, body, source_file, created_at').eq('work_id', w.id).order('no'),
      c.from('items').select('id, kind, name, note, look, status, source, confirmed, item_aliases(*)').eq('work_id', w.id),
      c.from('appearances').select('item_id, episode_id, evidence, source, role, items!inner(work_id)').eq('items.work_id', w.id),
      c.from('links').select('*').eq('work_id', w.id),
    ]);
    for (const r of [episodes, items, appearances, links]) if (r.error) throw r.error;
    const { data: epIds } = await c.from('episodes').select('id, no').eq('work_id', w.id);
    const epNo = new Map((epIds ?? []).map((e) => [e.id as string, e.no as number]));
    const itemName = new Map((items.data ?? []).map((i) => [i.id as string, i.name as string]));
    out.push({
      title: w.title,
      genre: w.genre,
      created_at: w.created_at,
      episodes: episodes.data,
      items: (items.data ?? []).map(({ id: _id, item_aliases, ...i }) => ({
        ...i,
        aliases: ((item_aliases ?? []) as { alias: string }[]).map((a) => a.alias),
      })),
      appearances: (appearances.data ?? []).map((a) => ({
        item: itemName.get(a.item_id as string),
        episode: epNo.get(a.episode_id as string),
        evidence: a.evidence,
        source: a.source,
        role: a.role,
      })),
      links: (links.data ?? []).map((l) => ({ a: itemName.get(l.a), b: itemName.get(l.b), kind: l.kind, label: l.label, weight: l.weight, direction: l.direction ?? 'none' })),
    });
  }
  return { app: 'My Universe', exported_at: new Date().toISOString(), works: out };
}

/** 내 작품을 모두 지운다(이미지 파일 포함). 지운 작품 수. */
export async function deleteAllMyWorks(userId: string): Promise<number> {
  const { data, error } = await db().from('works').select('id').eq('owner_id', userId);
  if (error) throw error;
  for (const w of data ?? []) await deleteWork(w.id as string);
  return (data ?? []).length;
}
