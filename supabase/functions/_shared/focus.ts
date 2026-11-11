/*
 * 별을 많이 골랐을 때 이번 회차를 이끌 "중심 별" 고르기(외부 라이브러리 없음 — 테스트와 Deno가 함께 쓴다).
 * 개연성을 이어 가도록 직전 회차의 마지막 장면에 나온 별 → 가장 최근 회차에 나온 별 → 최근에 나온 순.
 */

export type FocusItem = { id: string; name: string; aliases: string[]; last_ep: number | null };
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
    const score = (inEnding ? 1000 : 0) + (agoEp === 0 ? 300 : 0) + (agoEp != null ? 100 - Math.min(100, agoEp * 10) : 0);
    return { it: { ...it, why, agoEp } as Ranked<T>, score, order };
  });
  ranked.sort((a, b) => b.score - a.score || a.order - b.order);
  const all = ranked.map((r) => r.it);
  return items.length <= maxCore ? { core: all, side: [] } : { core: all.slice(0, maxCore), side: all.slice(maxCore) };
}
