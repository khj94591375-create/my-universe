import { searchTerms } from './detect';

export type Piece = { text: string; itemId?: string };

/** 글을 조각으로 나눠 항목 이름·별칭이 나온 부분에 itemId를 붙인다(회차 원고 강조용). */
export function highlightPieces(text: string, items: { id: string; name: string; aliases: string[] }[]): Piece[] {
  const terms = items.flatMap((i) => searchTerms(i).map((t) => ({ t, id: i.id }))).sort((x, y) => y.t.length - x.t.length);
  if (terms.length === 0) return [{ text }];
  const byTerm = new Map(terms.map((x) => [x.t, x.id]));
  const re = new RegExp(terms.map((x) => x.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], itemId: byTerm.get(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
