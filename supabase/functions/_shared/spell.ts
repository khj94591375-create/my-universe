/*
 * 맞춤법 검사 AI 결과 거르기(순수 함수, 서버·테스트 공용).
 * 원칙: 원고를 고치지 않는다. 작가가 고를 "제안"만 남기고, 아래는 버린다.
 * - 원문 조각이 실제 원고에 글자 그대로 없는 제안(위치를 찾을 수 없음)
 * - 바뀌는 것이 없는 제안
 * - 고유명사·세계관 용어·작가가 유지하기로 한 표현을 바꾸는 제안
 * - 문장을 통째로 다시 쓰는 제안(원문 조각이 길거나 길이가 크게 바뀜)
 */

export type SpellType = 'spelling' | 'spacing' | 'typo' | 'punctuation' | 'style';
export type RawSpell = { original: string; suggestion: string; type: SpellType; reason: string; certainty: 'sure' | 'check'; in_dialogue: boolean };

/** 원문 조각 최대 길이(이보다 길면 "문장 다시 쓰기"로 보고 버린다) */
export const MAX_ORIGINAL = 40;

const compact = (s: string) => s.replace(/\s+/g, '');

export function filterSpell(text: string, raw: RawSpell[], protectedTerms: string[]): { kept: RawSpell[]; dropped: number } {
  const terms = protectedTerms.map((t) => t.trim()).filter((t) => t.length > 0);
  const seen = new Set<string>();
  const kept: RawSpell[] = [];
  for (const r of raw) {
    const original = r.original;
    const suggestion = r.suggestion;
    if (!original || !text.includes(original)) continue;
    if (original === suggestion) continue;
    if ([...original].length > MAX_ORIGINAL) continue;
    // 띄어쓰기만 바뀌는 게 아니면, 길이가 절반 넘게 바뀌는 제안은 다시 쓰기로 본다
    const a = [...compact(original)].length;
    const b = [...compact(suggestion)].length;
    if (compact(original) !== compact(suggestion) && Math.abs(a - b) > Math.max(3, Math.ceil(a * 0.5))) continue;
    // 보호 단어: 원문 조각에 있는 보호 단어는 제안에도 그대로 있어야 한다
    if (terms.some((t) => original.includes(t) && !suggestion.includes(t))) continue;
    // 원문 조각 자체가 보호 단어의 일부(예: 이름 일부만 고치기)면 버린다
    if (terms.some((t) => t.includes(original) || compact(t) === compact(original))) continue;
    const key = `${original}→${suggestion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 대사 안의 제안은 의도적일 수 있어 늘 "확인 필요"
    kept.push({ ...r, reason: r.reason.trim().slice(0, 200), certainty: r.in_dialogue ? 'check' : r.certainty });
  }
  return { kept, dropped: raw.length - kept.length };
}
