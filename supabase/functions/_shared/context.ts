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

/** hasEnding: 직전 회차의 마지막 장면을 넣었는지 */
export type BuiltContext = { text: string; scenes: Map<string, string>; hasEnding?: boolean; endingTexts?: string[] };

/** 직전 회차의 끝부분: 다음 회차가 매끄럽게 이어지도록 항상 함께 보낸다. */
export type CtxEnding = { ep: number; title: string | null; scenes: CtxScene[] };

/**
 * 직전 회차의 마지막 장면 n개(장면 순서대로), 합계 maxChars 이내.
 * 넘치면 앞 장면부터 빼고, 마지막 장면 하나만으로도 넘치면 그 장면의 끝부분만(문장 경계에서 시작) 쓴다.
 * 끝부분도 원래 장면 글자의 일부라서 근거 검증(글자 그대로)이 그대로 통한다.
 */
export function pickEnding(scenes: CtxScene[], n = 2, maxChars = 2500): CtxScene[] {
  const last = [...scenes].sort((a, b) => a.seq - b.seq).slice(-n);
  while (last.length > 1 && last.reduce((s, x) => s + x.text.length, 0) > maxChars) last.shift();
  if (last.length === 1 && last[0].text.length > maxChars) {
    const t = last[0].text;
    let tail = t.slice(t.length - maxChars);
    const cut = tail.search(/[.!?…]["'”’」』)]*\s/);
    if (cut >= 0 && cut < tail.length / 2) tail = tail.slice(cut).replace(/^[.!?…"'”’」』)\s]+/, '');
    last[0] = { ...last[0], text: tail };
  }
  return last;
}

/** AI에게 넣을 글: 설정집 요약 + 회차 요약 + 꼬리표 붙은 장면. scenes는 근거 검증용. */
export function buildContext(items: CtxItem[], summaries: CtxSummary[], scenes: CtxScene[], ending?: CtxEnding): BuiltContext {
  const map = new Map<string, string>();
  const lines: string[] = [];
  // 직전 회차의 끝부분을 맨 앞에(다음 회차는 여기서 이어진다)
  if (ending && ending.scenes.length) {
    lines.push(`## 직전 회차(${ending.ep}화${ending.title ? ` 「${ending.title}」` : ''})의 마지막 장면 — 다음 회차는 여기서 이어진다`);
    for (const s of ending.scenes) {
      const tag = makeTag(s.ep, s.seq);
      map.set(tag, s.text);
      lines.push('', `[${tag}]`, s.text);
    }
    lines.push('');
  }
  lines.push('## 설정집');
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
  scenes = scenes.filter((s) => !map.has(makeTag(s.ep, s.seq))); // 직전 회차 끝 장면과 겹치면 한 번만
  if (scenes.length) {
    lines.push('', '## 원고 장면 (근거는 이 장면의 문장을 글자 그대로 옮기고, 꼬리표를 함께 적는다)');
    for (const s of scenes) {
      const tag = makeTag(s.ep, s.seq);
      map.set(tag, s.text);
      lines.push('', `[${tag}]`, s.text);
    }
  }
  return { text: lines.join('\n'), scenes: map, hasEnding: Boolean(ending && ending.scenes.length), endingTexts: ending?.scenes.map((s) => s.text) ?? [] };
}

/** 문장 나누기(화면 쪽 features/analysis/split.ts와 같은 규칙). */
export function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?…”"」』])\s+/g, '$1\n')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type ConsistencyItem = { name: string; aliases: string[]; look: string | null; note: string | null };

/**
 * 설정 충돌 검사용 글(BUILD_SPEC 8.8): 항목마다 그 항목이 나온 문장(외모·나이·능력·관계 묘사가 담긴 문장)을 꼬리표와 함께.
 * scenes는 그 항목들이 나온 장면들. 근거 검증을 위해 장면 본문 지도도 돌려준다.
 */
export function buildConsistencyContext(items: ConsistencyItem[], scenes: CtxScene[], maxChars: number = LIMITS.maxChars): BuiltContext {
  const map = new Map<string, string>();
  for (const s of scenes) map.set(makeTag(s.ep, s.seq), s.text);
  const perItem = Math.max(400, Math.floor(maxChars / Math.max(1, items.length)));
  const lines: string[] = [];
  for (const it of items) {
    const names = [it.name, ...it.aliases].filter((n) => n.length >= 2);
    lines.push('', `### ${it.name}${it.aliases.length ? ` (별칭: ${it.aliases.join(', ')})` : ''}`);
    if (it.look) lines.push(`설정집 외모: ${it.look}`);
    if (it.note) lines.push(`설정집 설명: ${it.note}`);
    let used = 0;
    for (const s of [...scenes].sort((a, b) => a.ep - b.ep || a.seq - b.seq)) {
      for (const sentence of splitSentences(s.text)) {
        if (!names.some((n) => sentence.includes(n))) continue;
        const line = `[${makeTag(s.ep, s.seq)}] ${sentence}`;
        if (used + line.length > perItem) break;
        lines.push(line);
        used += line.length;
      }
    }
  }
  return { text: `## 항목별 원고 문장${lines.join('\n')}`, scenes: map };
}
