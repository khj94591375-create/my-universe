/*
 * AI 결과를 저장·표시하기 전에 거르는 규칙(BUILD_SPEC 8.4~8.7). 순수 함수.
 */
import { keepVerified, normalize, verifyEvidence } from './verify.ts';

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

/** 장면 본문을 문장으로 나눈다(뒤쪽 확인 정규식 없이: 브라우저와 함께 쓰는 규칙) */
function sentencesOf(text: string): string[] {
  return text
    .replace(/([.!?…]["'”’」』)]*)\s+/g, '$1\n')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * AI가 준 관계를 저장 전에 바로잡는다(근거를 지어내지는 않는다).
 * - 이름: 앞뒤 공백·「」·따옴표를 떼고, 별칭으로 적었으면 설정집 이름으로 바꾼다.
 * - 근거: 꼬리표 장면에 글자 그대로 없으면 이 회차의 다른 장면에서 찾고(꼬리표만 틀린 경우),
 *   그래도 없으면 두 항목 이름(별칭 포함)이 함께 나오는 원고 문장을 근거로 쓴다. 그런 문장도 없으면 버린다.
 * names: 설정집 이름 → [이름, ...별칭]
 */
export function repairRelations<T extends Ev & { a: string; b: string; label: string }>(list: T[], scenes: Map<string, string>, names: Map<string, string[]>): T[] {
  const clean = (n: string) => n.trim().replace(/^[「『"'“‘\[(]+|[」』"'”’\])]+$/g, '').trim();
  const canon = new Map<string, string>();
  for (const [name, aliases] of names) for (const n of [name, ...aliases]) if (n.trim() && !canon.has(n.trim())) canon.set(n.trim(), name);
  const toName = (n: string) => canon.get(clean(n)) ?? null;
  const out: T[] = [];
  for (const r of list) {
    const a = toName(r.a);
    const b = toName(r.b);
    if (!a || !b || a === b) continue;
    let { evidence, tag } = r;
    if (!verifyEvidence(evidence, tag, scenes)) {
      const ev = normalize(evidence ?? '');
      const hit = ev.length >= 6 ? [...scenes].find(([, text]) => normalize(text).includes(ev)) : undefined;
      if (hit) tag = hit[0];
      else {
        const has = (sent: string, n: string) => (names.get(n) ?? [n]).concat(n).some((x) => x.trim().length >= 2 && sent.includes(x.trim()));
        let found: [string, string] | null = null;
        for (const [t, text] of scenes) {
          const sent = sentencesOf(text).find((x) => has(x, a) && has(x, b));
          if (sent) {
            found = [t, sent];
            break;
          }
        }
        if (!found) continue;
        [tag, evidence] = found;
      }
    }
    out.push({ ...r, a, b, evidence, tag, label: r.label.trim() });
  }
  return out;
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

export type EndingIn = { place: string; time: string; pov: string; people: string; last_moment: string; tension: string; evidence: string; tag: string };
export type EndingOut = Omit<EndingIn, 'evidence'> & { evidence: string | null };

/** 직전 회차 끝 상황: 직전 회차 자료가 있을 때만, 근거 문장은 원고에 글자 그대로 있을 때만 */
export function finishEnding(e: EndingIn | null | undefined, hasEnding: boolean, scenes: Map<string, string>): EndingOut | null {
  if (!hasEnding || !e) return null;
  const t = (s: string) => (s ?? '').trim();
  const out = { place: t(e.place), time: t(e.time), pov: t(e.pov), people: t(e.people), last_moment: t(e.last_moment), tension: t(e.tension), tag: t(e.tag) };
  if (!Object.values(out).some(Boolean)) return null;
  return { ...out, evidence: verifyEvidence(e.evidence, e.tag, scenes) ? t(e.evidence) : null };
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
