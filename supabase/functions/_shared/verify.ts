/*
 * 근거 검증(BUILD_SPEC 8.3) [고정]. AI가 준 근거 문장이 꼬리표의 장면 본문에 글자 그대로 있는지 확인한다.
 * 이 파일은 외부 라이브러리를 쓰지 않는다(브라우저 테스트와 Deno 함수가 함께 쓴다).
 */

/** 장면 꼬리표 "E7-S2" → { ep: 7, seq: 2 } */
export function parseTag(tag: string): { ep: number; seq: number } | null {
  const m = /^\[?E(\d+)-S(\d+)\]?$/.exec(tag.trim());
  return m ? { ep: Number(m[1]), seq: Number(m[2]) } : null;
}

export function makeTag(ep: number, seq: number): string {
  return `E${ep}-S${seq}`;
}

/** 비교용 정규화: 따옴표 종류, 말줄임표, 공백을 통일한다. */
export function normalize(s: string): string {
  return s
    .replace(/[“”„‟〝〞＂]/g, '"')
    .replace(/[‘’‚‛＇`]/g, "'")
    .replace(/\.{3}/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 이보다 짧은 "근거"는 무엇이든 들어 있을 수 있어 인정하지 않는다. */
export const MIN_EVIDENCE = 6;

/** 근거 문장이 꼬리표 장면에 들어 있으면 true. scenes: 꼬리표 → 장면 본문 */
export function verifyEvidence(evidence: string | null | undefined, tag: string | null | undefined, scenes: Map<string, string>): boolean {
  if (!evidence || !tag) return false;
  const parsed = parseTag(tag);
  if (!parsed) return false;
  const text = scenes.get(makeTag(parsed.ep, parsed.seq));
  if (!text) return false;
  const ev = normalize(evidence);
  return ev.length >= MIN_EVIDENCE && normalize(text).includes(ev);
}

/** 근거가 검증된 것만 남긴다(추출 결과용: 나머지는 버림). */
export function keepVerified<T extends { evidence?: string | null; tag?: string | null }>(list: T[], scenes: Map<string, string>): T[] {
  return list.filter((x) => verifyEvidence(x.evidence, x.tag, scenes));
}
