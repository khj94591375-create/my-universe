import type { Item, ItemKind, ItemStatus, LinkDirection, LinkKind } from './types';
import { db } from './client';

/* 설정집 항목·별칭·연결선 쓰기 함수(BUILD_SPEC 6.8). */

export type ItemInput = { kind: ItemKind; name: string; note?: string | null; look?: string | null };

export async function createItem(workId: string, input: ItemInput): Promise<Item> {
  const { data, error } = await db()
    .from('items')
    .insert({ work_id: workId, kind: input.kind, name: input.name.trim(), note: input.note || null, look: input.look || null, source: 'manual' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Item;
}

export async function updateItem(id: string, patch: Partial<Pick<Item, 'kind' | 'name' | 'note' | 'look' | 'status' | 'confirmed'>>) {
  const clean = { ...patch, ...(patch.name != null ? { name: patch.name.trim() } : {}) };
  const { error } = await db().from('items').update(clean).eq('id', id);
  if (error) throw error;
}

export async function setItemStatus(id: string, status: ItemStatus) {
  return updateItem(id, { status });
}

export async function deleteItem(id: string) {
  const { error } = await db().from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function addAlias(itemId: string, alias: string) {
  const { error } = await db().from('item_aliases').upsert({ item_id: itemId, alias: alias.trim() }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeAlias(itemId: string, alias: string) {
  const { error } = await db().from('item_aliases').delete().eq('item_id', itemId).eq('alias', alias);
  if (error) throw error;
}

/** 연결선은 항상 작은 id가 a(DB 제약 a < b). */
export function orderPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

/** 작가가 직접 잇는 연결선. directed면 from → to 화살표. */
export async function addManualLink(workId: string, from: string, to: string, label: string, directed = false) {
  const [a, b] = orderPair(from, to);
  const direction: LinkDirection = directed ? (from === a ? 'forward' : 'backward') : 'none';
  const row: Record<string, unknown> = { work_id: workId, a, b, kind: 'manual' as LinkKind, label: label.trim() || null, weight: 1 };
  if (directed) row.direction = direction;
  // 방향이 없으면 direction 칸을 보내지 않는다(0002 SQL 실행 전에도 동작하도록)
  const { error } = await db()
    .from('links')
    .upsert(row, { onConflict: 'a,b,kind' });
  if (error) throw error;
}

export async function deleteLink(id: string) {
  const { error } = await db().from('links').delete().eq('id', id);
  if (error) throw error;
}

/**
 * 두 항목 합치기: drop의 등장·별칭·연결선을 keep으로 옮기고 drop을 지운다.
 * drop의 이름은 keep의 별칭이 된다. 같은 장면 연결선은 호출한 쪽에서 다시 계산한다.
 */
export async function mergeItems(keepId: string, dropId: string) {
  const c = db();
  const [{ data: drop, error: e1 }, { data: dropAliases, error: e2 }] = await Promise.all([
    c.from('items').select('name').eq('id', dropId).single(),
    c.from('item_aliases').select('alias').eq('item_id', dropId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  // 등장: 같은 (회차, 장면)에 keep이 이미 있으면 drop 쪽은 버린다
  const [{ data: keepApps, error: e3 }, { data: dropApps, error: e4 }] = await Promise.all([
    c.from('appearances').select('episode_id, chunk_id').eq('item_id', keepId),
    c.from('appearances').select('id, episode_id, chunk_id').eq('item_id', dropId),
  ]);
  if (e3) throw e3;
  if (e4) throw e4;
  const has = new Set((keepApps ?? []).map((a) => `${a.episode_id}|${a.chunk_id}`));
  const move = (dropApps ?? []).filter((a) => !has.has(`${a.episode_id}|${a.chunk_id}`)).map((a) => a.id);
  if (move.length) {
    const { error } = await c.from('appearances').update({ item_id: keepId }).in('id', move);
    if (error) throw error;
  }

  // 별칭: drop의 이름과 별칭
  const aliases = [drop.name as string, ...(dropAliases ?? []).map((a) => a.alias as string)];
  const { error: e5 } = await c
    .from('item_aliases')
    .upsert(aliases.map((alias) => ({ item_id: keepId, alias })), { ignoreDuplicates: true });
  if (e5) throw e5;

  // 연결선(AI·작가): keep 쪽으로 다시 만든다. 같은 장면 연결선은 다시 계산하므로 건너뛴다
  const { data: links, error: e6 } = await c.from('links').select('*').or(`a.eq.${dropId},b.eq.${dropId}`).neq('kind', 'co_occur');
  if (e6) throw e6;
  const rows = (links ?? [])
    .map((l) => {
      const other = l.a === dropId ? l.b : l.a;
      if (other === keepId) return null;
      const [a, b] = orderPair(keepId, other);
      const row = { work_id: l.work_id, a, b, kind: l.kind, label: l.label, weight: l.weight, evidence: l.evidence };
      if (!l.direction || l.direction === 'none') return row;
      // drop이 있던 자리(a/b)와 keep이 들어간 자리가 다르면 방향을 뒤집는다
      const dropWasA = l.a === dropId;
      const keepIsA = a === keepId;
      const flip = dropWasA !== keepIsA;
      return { ...row, direction: flip ? (l.direction === 'forward' ? 'backward' : 'forward') : l.direction };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
  if (rows.length) {
    const { error } = await c.from('links').upsert(rows, { onConflict: 'a,b,kind', ignoreDuplicates: true });
    if (error) throw error;
  }
  await deleteItem(dropId);
}
