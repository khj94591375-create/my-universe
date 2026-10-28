import { limits } from '../../config/limits';

/*
 * 같은 장면 연결선(규칙, BUILD_SPEC 7.4).
 */

export type CoOccur = { a: string; b: string; weight: number };

/**
 * chunkItems: 장면 id → 그 장면에 나온 항목 id들. totalChunks: 작품 전체 장면 수.
 * 전체 장면의 60% 이상에 나오는 항목은 빼고, 함께 나온 쌍마다 weight를 센다. a < b.
 */
export function computeCoOccur(chunkItems: Map<string, Set<string>>, totalChunks: number, hubRatio: number = limits.coOccurHubRatio): CoOccur[] {
  const freq = new Map<string, number>();
  for (const items of chunkItems.values()) for (const id of items) freq.set(id, (freq.get(id) ?? 0) + 1);
  const hubs = new Set([...freq].filter(([, n]) => totalChunks > 0 && n >= hubRatio * totalChunks).map(([id]) => id));
  const pairs = new Map<string, CoOccur>();
  for (const items of chunkItems.values()) {
    const ids = [...items].filter((id) => !hubs.has(id)).sort();
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        const p = pairs.get(key) ?? { a: ids[i], b: ids[j], weight: 0 };
        p.weight += 1;
        pairs.set(key, p);
      }
  }
  return [...pairs.values()];
}
