/*
 * RAG v1 근거 조립(BUILD_SPEC 8.2). DB에서 가져온 재료를 AI에게 넣을 글로 만든다.
 * DB를 읽는 부분은 retrieval.ts, 여기는 순수 함수(테스트 가능).
 */
import { makeTag } from './verify.ts';

export type CtxItem = {
  id: string;
  kind: 'character' | 'setting' | 'foreshadow';
  name: string;
  aliases: string[];
  note: string | null;
  status: string;
  first_ep: number | null;
  last_ep: number | null;
  gap: number | null;
};
export type CtxSummary = { no: number; title: string | null; summary: string | null };
export type CtxScene = { ep: number; seq: number; text: string };

export const LIMITS = { maxItems: 150, maxScenes: 8, maxChars: 12000 } as const;

const KIND = { character: '캐릭터', setting: '설정', foreshadow: '복선' } as const;
const STATUS: Record<string, string> = { open: '미회수', resolved: '회수 완료', reuse_planned: '재사용 예정', reused: '재사용됨' };

/** 항목이 많으면 선택 항목·연결 항목·오래 잊힌 항목 위주로 줄인다. */
export function trimItems(items: CtxItem[], focus: Set<string>, linked: Set<string>, max: number = LIMITS.maxItems): CtxItem[] {
  if (items.length <= max) return items;
  const rank = (i: CtxItem) => (focus.has(i.id) ? 0 : linked.has(i.id) ? 1 : 2);
  return [...items].sort((a, b) => rank(a) - rank(b) || (b.gap ?? -1) - (a.gap ?? -1)).slice(0, max);
}

/** 장면은 최대 8개, 합계 약 12,000자. 앞에 있는 것(우선순위가 높은 것)부터 넣는다. */
export function pickScenes(scenes: CtxScene[], maxScenes: number = LIMITS.maxScenes, maxChars: number = LIMITS.maxChars): CtxScene[] {
  const out: CtxScene[] = [];
  const seen = new Set<string>();
  let chars = 0;
  for (const s of scenes) {
    const tag = makeTag(s.ep, s.seq);
    if (seen.has(tag)) continue;
    if (out.length >= maxScenes) break;
    if (out.length > 0 && chars + s.text.length > maxChars) continue;
    seen.add(tag);
    out.push(s);
    chars += s.text.length;
  }
  return out;
}

export type BuiltContext = { text: string; scenes: Map<string, string> };

/** AI에게 넣을 글: 설정집 요약 + 회차 요약 + 꼬리표 붙은 장면. scenes는 근거 검증용. */
export function buildContext(items: CtxItem[], summaries: CtxSummary[], scenes: CtxScene[]): BuiltContext {
  const lines: string[] = ['## 설정집'];
  if (items.length === 0) lines.push('(아직 없음)');
  for (const i of items) {
    const parts = [`- [${KIND[i.kind]}] ${i.name}`];
    if (i.aliases.length) parts.push(`(별칭: ${i.aliases.join(', ')})`);
    if (i.kind === 'foreshadow') parts.push(`· ${STATUS[i.status] ?? i.status}`);
    if (i.first_ep != null) parts.push(`· ${i.first_ep === i.last_ep ? `${i.first_ep}화` : `${i.first_ep}~${i.last_ep}화`}`);
    if (i.note) parts.push(`· ${i.note}`);
    lines.push(parts.join(' '));
  }
  const withSummary = summaries.filter((s) => s.summary);
  if (withSummary.length) {
    lines.push('', '## 회차 요약');
    for (const s of [...withSummary].sort((a, b) => a.no - b.no)) lines.push(`- ${s.no}화${s.title ? ` 「${s.title}」` : ''}: ${s.summary}`);
  }
  const map = new Map<string, string>();
  if (scenes.length) {
    lines.push('', '## 원고 장면 (근거는 이 장면의 문장을 글자 그대로 옮기고, 꼬리표를 함께 적는다)');
    for (const s of scenes) {
      const tag = makeTag(s.ep, s.seq);
      map.set(tag, s.text);
      lines.push('', `[${tag}]`, s.text);
    }
  }
  return { text: lines.join('\n'), scenes: map };
}
