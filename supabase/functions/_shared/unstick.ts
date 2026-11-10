/*
 * 막힌 장면 대안 전개: 설정집에 있는 항목만, 원고에 글자 그대로 있는 근거만 남긴다. 대안은 최대 3개.
 */
import { parseTag, verifyEvidence } from './verify.ts';

type RawUse = { item: string; evidence: string; tag: string };
type RawOption = { title: string; plan: string; uses: RawUse[]; caution: string };
export type AltUse = { item: string; evidence: string | null; ep: number | null };
export type AltOption = { title: string; plan: string; uses: AltUse[]; caution: string };

export function finishAlternatives(raw: RawOption[], scenes: Map<string, string>, itemNames: Set<string>): AltOption[] {
  return raw
    .filter((o) => o.title.trim() && o.plan.trim())
    .slice(0, 3)
    .map((o) => {
      const seen = new Set<string>();
      const uses: AltUse[] = [];
      for (const u of o.uses) {
        const item = u.item.trim();
        if (!itemNames.has(item) || seen.has(item)) continue;
        seen.add(item);
        const ok = verifyEvidence(u.evidence, u.tag, scenes);
        uses.push({ item, evidence: ok ? u.evidence.trim() : null, ep: ok ? (parseTag(u.tag)?.ep ?? null) : null });
      }
      return { title: o.title.trim(), plan: o.plan.trim(), uses, caution: o.caution.trim() };
    });
}
