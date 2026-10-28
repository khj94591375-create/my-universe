import { splitSentences, trimEvidence } from './split';

/*
 * 재등장 감지(규칙, BUILD_SPEC 7.3). 장면 글자에서 항목 이름·별칭을 글자 그대로 찾는다.
 */

export type DetectItem = { id: string; name: string; aliases: string[] };
export type DetectChunk = { id: string; text: string };
export type Detected = { itemId: string; chunkId: string; evidence: string };

/** 찾을 단어: 이름, 별칭, 그리고 이름이 띄어 쓴 여러 단어면 3글자 이상인 마지막 단어. */
export function searchTerms(item: Pick<DetectItem, 'name' | 'aliases'>): string[] {
  const terms = [item.name, ...item.aliases].map((t) => t.trim()).filter(Boolean);
  const parts = item.name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last.length >= 3) terms.push(last);
  return [...new Set(terms)];
}

/** 한 장면에서 항목을 찾고, 처음 일치한 문장을 근거로 돌려준다. */
export function findInText(text: string, item: Pick<DetectItem, 'name' | 'aliases'>): string | null {
  const terms = searchTerms(item);
  for (const sentence of splitSentences(text)) {
    const term = terms.find((t) => sentence.includes(t));
    if (term) return trimEvidence(sentence, term);
  }
  return null;
}

export function detectAppearances(chunks: DetectChunk[], items: DetectItem[]): Detected[] {
  const out: Detected[] = [];
  for (const chunk of chunks) {
    for (const item of items) {
      const evidence = findInText(chunk.text, item);
      if (evidence) out.push({ itemId: item.id, chunkId: chunk.id, evidence });
    }
  }
  return out;
}
