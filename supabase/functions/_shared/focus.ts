/*
 * 별을 많이 골랐을 때 이번 회차를 이끌 "중심 별" 고르기(외부 라이브러리 없음 — 테스트와 Deno가 함께 쓴다).
 * 개연성을 이어 가도록: 직전 회차의 마지막 장면에 나온 별 → 마지막으로 나온 위치가 더 뒤인 별
 * (더 최근 회차 → 같은 회차면 더 뒤 장면) → 그 회차에 더 자주 나온 별 → 고른 순서.
 */

/** lastSeq: 마지막으로 나온 회차(last_ep) 안에서 가장 뒤 장면 번호, count: 그 회차에 나온 장면 수 */
export type FocusItem = { id: string; name: string; aliases: string[]; last_ep: number | null; lastSeq?: number | null; count?: number };
export type FocusWhy = 'ending' | 'latest' | 'recent' | 'none';
export type Ranked<T> = T & { why: FocusWhy; agoEp: number | null };

/** 이보다 많이 고르면 앞의 몇 개만 중심 별로 */
export const MAX_CORE = 3;

function mentioned(texts: string[], it: FocusItem): boolean {
  const terms = [it.name, ...it.aliases].map((t) => t.trim()).filter((t) => [...t].length >= 2);
  return texts.some((txt) => terms.some((t) => txt.includes(t)));
}

export function rankFocus<T extends FocusItem>(items: T[], endingTexts: string[], latestEp: number | null, maxCore = MAX_CORE): { core: Ranked<T>[]; side: Ranked<T>[] } {
  const ranked = items.map((it, order) => {
    const inEnding = mentioned(endingTexts, it);
    const agoEp = latestEp != null && it.last_ep != null ? Math.max(0, latestEp - it.last_ep) : null;
    const why: FocusWhy = inEnding ? 'ending' : agoEp === 0 ? 'latest' : agoEp != null ? 'recent' : 'none';
    return { it: { ...it, why, agoEp } as Ranked<T>, inEnding, ep: it.last_ep ?? -1, seq: it.lastSeq ?? 0, count: it.count ?? 0, order };
  });
  ranked.sort((a, b) => Number(b.inEnding) - Number(a.inEnding) || b.ep - a.ep || b.seq - a.seq || b.count - a.count || a.order - b.order);
  const all = ranked.map((r) => r.it);
  return items.length <= maxCore ? { core: all, side: [] } : { core: all.slice(0, maxCore), side: all.slice(maxCore) };
}

/** 등장 기록으로 별마다 마지막 등장 위치(회차 안 가장 뒤 장면)와 그 회차에서 나온 장면 수를 구한다. 장면이 비어 있는 기록은 장면 0 */
export function lastPositions(
  apps: { item_id: string; episode_id: string; chunk_id: string | null }[],
  epNo: Map<string, number>,
  seqOf: Map<string, number>,
): Map<string, { ep: number; seq: number; count: number }> {
  const out = new Map<string, { ep: number; seq: number; count: number; chunks: Set<string> }>();
  for (const a of apps) {
    const ep = epNo.get(a.episode_id);
    if (ep == null) continue;
    const seq = a.chunk_id ? (seqOf.get(a.chunk_id) ?? 0) : 0;
    const cur = out.get(a.item_id);
    const key = a.chunk_id ?? `none:${a.episode_id}`;
    if (!cur || ep > cur.ep) out.set(a.item_id, { ep, seq, count: 1, chunks: new Set([key]) });
    else if (ep === cur.ep) {
      cur.seq = Math.max(cur.seq, seq);
      if (!cur.chunks.has(key)) {
        cur.chunks.add(key);
        cur.count++;
      }
    }
  }
  return new Map([...out].map(([id, v]) => [id, { ep: v.ep, seq: v.seq, count: v.count }]));
}
