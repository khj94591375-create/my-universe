/*
 * 세계관 질문하기: 질문에 나온 설정집 항목 찾기, 근거 검증 결과 정리. 외부 라이브러리 없음(브라우저 테스트와 Deno가 함께 쓴다).
 */
import { parseTag, verifyEvidence } from './verify.ts';

export type AskItem = { id: string; name: string; aliases: string[] };

/** 질문에 이름이나 별칭(두 글자 이상)이 들어 있는 항목 id. 긴 이름부터 보고 최대 max개 */
export function itemsInQuestion(question: string, items: AskItem[], max = 8): string[] {
  const q = question.replace(/\s+/g, ' ');
  const hits: { id: string; len: number }[] = [];
  for (const it of items) {
    const names = [it.name, ...it.aliases].filter((n) => n && [...n.trim()].length >= 2);
    const best = names.filter((n) => q.includes(n.trim())).sort((a, b) => b.length - a.length)[0];
    if (best) hits.push({ id: it.id, len: best.length });
  }
  return hits
    .sort((a, b) => b.len - a.len)
    .slice(0, max)
    .map((h) => h.id);
}

export type AskEvidence = { text: string; tag: string; ep: number | null };

/** 원고에 글자 그대로 있는 근거만 남긴다(중복 제거). 근거가 하나도 없으면 "원고에서 확인됨"으로 표시하지 않는다 */
export function keepVerified(raw: { text: string; tag: string }[], scenes: Map<string, string>): { evidence: AskEvidence[]; dropped: number } {
  const seen = new Set<string>();
  const evidence: AskEvidence[] = [];
  let dropped = 0;
  for (const e of raw) {
    if (!verifyEvidence(e.text, e.tag, scenes)) {
      dropped++;
      continue;
    }
    const key = `${e.tag}|${e.text.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    evidence.push({ text: e.text.trim(), tag: e.tag, ep: parseTag(e.tag)?.ep ?? null });
  }
  return { evidence, dropped };
}
