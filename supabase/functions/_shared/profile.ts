/*
 * 인물 소개 카드: 항목마다 원고 근거가 확인된 것만 남긴다. 근거가 하나도 없는 항목은 비운다(지어낸 설명 방지).
 */
import { keepVerified, type AskEvidence } from './ask.ts';

export const PROFILE_FIELDS = ['look', 'personality', 'speech'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
type RawField = { text: string; evidence: { text: string; tag: string }[] };
export type ProfileOut = Record<ProfileField, { text: string; evidence: AskEvidence[] }> & { dropped: number };

export function finishProfile(raw: Record<ProfileField, RawField>, scenes: Map<string, string>): ProfileOut {
  let dropped = 0;
  const out = { dropped: 0 } as ProfileOut;
  for (const f of PROFILE_FIELDS) {
    const r = raw[f] ?? { text: '', evidence: [] };
    const v = keepVerified(r.evidence ?? [], scenes);
    dropped += v.dropped;
    const text = r.text.trim();
    out[f] = v.evidence.length && text ? { text, evidence: v.evidence.slice(0, 3) } : { text: '', evidence: [] };
  }
  out.dropped = dropped;
  return out;
}
