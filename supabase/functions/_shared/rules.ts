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
/** 초안 길이 제한: 넘으면 그 안의 마지막 문장 끝(. ! ? … 닫는 따옴표)에서 끊고, 문장 끝이 없을 때만 말줄임 */
export function trimAtSentence(text: string, max: number): string {
  const t = text.trim();
  const chars = [...t];
  if (chars.length <= max) return t;
  const head = chars.slice(0, max).join('');
  let cut = -1;
  const re = /[.!?…]["'”’」』)]*/g;
  for (let m = re.exec(head); m; m = re.exec(head)) cut = m.index + m[0].length;
  return cut > 0 ? head.slice(0, cut).trim() : `${chars.slice(0, max - 1).join('').trim()}…`;
}

export function finishDesign<T extends { scenes: { no: number; text: string; uses: (Ev & { item: string })[] }[]; draft?: string | null }>(
  out: T,
  includeDraft: boolean,
  scenes: Map<string, string>,
  draftMax = 300,
) {
  return {
    scenes: out.scenes.map((s) => ({
      no: s.no,
      text: s.text,
      uses: s.uses.map((u) => ({ item: u.item, evidence: verifyEvidence(u.evidence, u.tag, scenes) ? u.evidence : null, tag: u.tag })),
    })),
    draft: includeDraft && out.draft ? trimAtSentence(out.draft, draftMax) : null,
  };
}

/** 가이드·대화의 근거: 검증 안 된 문장은 보여 주지 않는다(null). */
export function markEvidence<T extends Ev>(list: T[], scenes: Map<string, string>): (Omit<T, 'evidence'> & { evidence: string | null })[] {
  return list.map((x) => ({ ...x, evidence: verifyEvidence(x.evidence, x.tag, scenes) ? x.evidence : null }));
}

export type IssueOut = { item_name: string; description: string; a: Ev; b: Ev };

/** 7.9 [고정]: 두 근거가 모두 원고에 글자 그대로 있고, 서로 다른 문장이어야 저장한다. */
export function filterIssues(issues: IssueOut[], scenes: Map<string, string>, itemNames: Set<string>): IssueOut[] {
  return issues.filter(
    (i) =>
      itemNames.has(i.item_name) &&
      i.description.trim() &&
      verifyEvidence(i.a.evidence, i.a.tag, scenes) &&
      verifyEvidence(i.b.evidence, i.b.tag, scenes) &&
      i.a.evidence.trim() !== i.b.evidence.trim(),
  );
}
