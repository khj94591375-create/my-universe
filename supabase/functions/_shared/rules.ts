/*
 * AI 결과를 저장·표시하기 전에 거르는 규칙(BUILD_SPEC 8.4~8.7). 순수 함수.
 */
import { keepVerified, verifyEvidence } from './verify.ts';

export const MIN_CONFIDENCE = 0.5;

type Ev = { evidence: string; tag: string };
export type AnalysisOut = {
  summary: string;
  new_items: (Ev & { kind: 'character' | 'setting' | 'foreshadow'; name: string; note: string; look: string; confidence: number })[];
  aliases: (Ev & { item_name: string; alias: string })[];
  relations: (Ev & { a: string; b: string; label: string })[];
  resolutions: (Ev & { item_name: string })[];
};

/** 8.4 저장 규칙: confidence 0.5 미만 버림, 근거 검증 실패 버림, 이미 있는 이름은 새 항목에서 뺌. */
export function filterAnalysis(out: AnalysisOut, scenes: Map<string, string>, existingNames: Set<string>): AnalysisOut {
  const names = new Set(existingNames);
  const newItems = keepVerified(out.new_items.filter((i) => i.confidence >= MIN_CONFIDENCE && i.name.trim()), scenes).filter((i) => {
    const n = i.name.trim();
    if (names.has(n)) return false;
    names.add(n);
    return true;
  });
  return {
    summary: out.summary.trim(),
    new_items: newItems,
    aliases: keepVerified(out.aliases, scenes).filter((a) => existingNames.has(a.item_name) && a.alias.trim() && a.alias !== a.item_name),
    relations: keepVerified(out.relations, scenes).filter((r) => names.has(r.a) && names.has(r.b) && r.a !== r.b),
    resolutions: keepVerified(out.resolutions, scenes).filter((r) => existingNames.has(r.item_name)),
  };
}

/** 8.6 [고정]: 초안 스위치가 꺼져 있으면 서버에서 draft를 지운다. 근거 없는 사용처는 "근거 없음"으로. */
export function finishDesign<T extends { scenes: { no: number; text: string; uses: (Ev & { item: string })[] }[]; draft?: string | null }>(
  out: T,
  includeDraft: boolean,
  scenes: Map<string, string>,
) {
  return {
    scenes: out.scenes.map((s) => ({
      no: s.no,
      text: s.text,
      uses: s.uses.map((u) => ({ item: u.item, evidence: verifyEvidence(u.evidence, u.tag, scenes) ? u.evidence : null, tag: u.tag })),
    })),
    draft: includeDraft && out.draft ? out.draft.slice(0, 300) : null,
  };
}

/** 가이드·대화의 근거: 검증 안 된 문장은 보여 주지 않는다(null). */
export function markEvidence<T extends Ev>(list: T[], scenes: Map<string, string>): (Omit<T, 'evidence'> & { evidence: string | null })[] {
  return list.map((x) => ({ ...x, evidence: verifyEvidence(x.evidence, x.tag, scenes) ? x.evidence : null }));
}
