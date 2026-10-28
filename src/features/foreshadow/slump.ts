/*
 * 막혔어요 선택(BUILD_SPEC 7.2).
 */

export type SlumpCandidate = { id: string; status: string; gap: number | null };

/**
 * 상태가 open·reuse_planned이고 gap이 있는 항목 중 gap이 가장 큰 항목들에서 하나를 무작위로 고른다.
 * 직전에 고른 항목은 다른 후보가 있으면 한 번 뺀다. 후보가 없으면 null.
 */
export function pickSlumpItem(items: SlumpCandidate[], lastPickedId: string | null = null, random: () => number = Math.random): string | null {
  const cands = items.filter((i) => (i.status === 'open' || i.status === 'reuse_planned') && i.gap != null);
  if (cands.length === 0) return null;
  const pool = cands.length > 1 && lastPickedId ? cands.filter((i) => i.id !== lastPickedId) : cands;
  const max = Math.max(...pool.map((i) => i.gap as number));
  const top = pool.filter((i) => i.gap === max);
  return top[Math.floor(random() * top.length)].id;
}
