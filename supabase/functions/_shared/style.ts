/*
 * 문체 분석: 예시 문장이 원고에 실제로 있는 특징만 남긴다. 원고 표본 고르기.
 */
import { normalize } from './verify.ts';

type RawTrait = { name: string; description: string; examples: string[] };
export type Trait = { name: string; description: string; examples: string[] };

/** 회차마다 앞·가운데에서 고르게 잘라 최대 maxChars 글자 표본을 만든다 */
export function sampleBodies(bodies: string[], maxChars = 8000): string {
  const list = bodies.filter((b) => b.trim());
  if (!list.length) return '';
  const each = Math.max(400, Math.floor(maxChars / list.length));
  return list
    .map((b) => {
      if ([...b].length <= each) return b.trim();
      const half = Math.floor(each / 2);
      const mid = Math.floor(b.length / 2);
      return `${b.slice(0, half).trim()}\n…\n${b.slice(mid, mid + half).trim()}`;
    })
    .join('\n\n')
    .slice(0, maxChars);
}

/** 예시가 원고에 글자 그대로(4글자 이상) 있는 것만, 예시가 하나도 없는 특징은 뺀다. 최대 5개 */
export function keepTraits(raw: RawTrait[], source: string): { traits: Trait[]; dropped: number } {
  const text = normalize(source);
  let dropped = 0;
  const traits: Trait[] = [];
  for (const t of raw) {
    const examples = [...new Set(t.examples.map((e) => e.trim()))].filter((e) => {
      const ok = [...normalize(e)].length >= 4 && text.includes(normalize(e));
      if (!ok) dropped++;
      return ok;
    });
    if (t.name.trim() && t.description.trim() && examples.length) traits.push({ name: t.name.trim(), description: t.description.trim(), examples: examples.slice(0, 2) });
  }
  return { traits: traits.slice(0, 5), dropped };
}
