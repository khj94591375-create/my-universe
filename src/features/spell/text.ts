import type { AiSpell, Decision, Suggestion } from './types';

/*
 * 맞춤법 검사 처리(순수 함수): 긴 원고 나누기, 대사 범위, AI 제안 위치 찾기, 합치기, 수정 적용만 반영.
 */

/** 한 번에 AI로 보낼 글 길이(문단 단위로 묶음) */
export const CHUNK_MAX = 3000;

export type TextPart = { start: number; text: string };

/** 원고를 문단 단위로 묶어 나눈다. 아주 긴 문단은 문장 끝에서 자른다. 위치(start)를 함께 돌려준다. */
export function splitForCheck(body: string, max: number = CHUNK_MAX): TextPart[] {
  const parts: TextPart[] = [];
  let start = 0;
  let cur = '';
  const flush = () => {
    if (cur) parts.push({ start, text: cur });
    start += cur.length;
    cur = '';
  };
  // 문단(줄바꿈 포함) 단위
  const paras = body.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  for (const p of paras) {
    if (cur.length + p.length <= max) {
      cur += p;
      continue;
    }
    flush();
    if (p.length <= max) {
      cur = p;
      continue;
    }
    // 긴 문단: 문장 끝(. ! ? … 」 ") 뒤에서 자르되 max를 넘지 않게
    let rest = p;
    while (rest.length > max) {
      const slice = rest.slice(0, max);
      const cut = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '), slice.lastIndexOf('… '), slice.lastIndexOf('" '));
      const at = cut > max * 0.5 ? cut + 2 : max;
      cur = rest.slice(0, at);
      flush();
      rest = rest.slice(at);
    }
    cur = rest;
  }
  flush();
  return parts;
}

/** 큰따옴표(“ ” 또는 ") 대사 범위들 [시작, 끝) */
export function dialogueRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /“[^”\n]*”|"[^"\n]*"|「[^」\n]*」|『[^』\n]*』/g;
  for (const m of text.matchAll(re)) out.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  return out;
}

export const inRanges = (ranges: [number, number][], start: number, end: number) => ranges.some(([a, b]) => start >= a && end <= b);

/** 보호 단어(설정집 이름·별칭·작품 사전)가 나오는 범위들 */
export function protectedRanges(text: string, terms: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (const t of terms) {
    if (!t) continue;
    let i = text.indexOf(t);
    while (i >= 0) {
      out.push([i, i + t.length]);
      i = text.indexOf(t, i + t.length);
    }
  }
  return out;
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

let seq = 0;
const nextId = () => `s${++seq}`;

/** AI 제안을 원고 위치로 바꾼다. 같은 원문 조각이 여러 번 나오면 모두 제안으로 만든다(중복 표현). */
export function locateAi(part: TextPart, list: AiSpell[], fullText: string): Suggestion[] {
  const dialog = dialogueRanges(fullText);
  const out: Suggestion[] = [];
  for (const a of list) {
    if (!a.original) continue;
    let i = part.text.indexOf(a.original);
    while (i >= 0) {
      const start = part.start + i;
      const end = start + a.original.length;
      const inDialogue = a.in_dialogue || inRanges(dialog, start, end);
      out.push({ id: nextId(), start, end, original: a.original, suggestion: a.suggestion, type: a.type, reason: a.reason, certainty: inDialogue ? 'check' : a.certainty, inDialogue, source: 'ai' });
      i = part.text.indexOf(a.original, i + a.original.length);
    }
  }
  return out;
}

/**
 * 제안 합치기: 보호 단어를 건드리는 제안·작품 사전 표현은 빼고, 겹치는 제안은 먼저 온 것(AI 우선, 그다음 확실한 것)만 남긴다.
 * 결과는 원고 순서.
 */
export function mergeSuggestions(text: string, lists: Suggestion[][], protect: string[], dictionary: string[]): Suggestion[] {
  const guard = protectedRanges(text, protect);
  const dict = new Set(dictionary.map((d) => d.trim()).filter(Boolean));
  const all = lists.flat().filter((sg) => {
    if (dict.has(sg.original.trim())) return false;
    if ([...dict].some((d) => sg.original.includes(d))) return false;
    // 보호 단어 범위와 겹치면서 그 단어를 바꾸는 제안은 뺀다
    return !guard.some((g) => overlaps(g, [sg.start, sg.end]) && !sg.suggestion.includes(text.slice(g[0], g[1])));
  });
  const rank = (sg: Suggestion) => (sg.source === 'ai' ? 0 : 2) + (sg.certainty === 'sure' ? 0 : 1);
  const picked: Suggestion[] = [];
  for (const sg of [...all].sort((x, y) => rank(x) - rank(y) || x.start - y.start)) {
    if (picked.some((p) => overlaps([p.start, p.end], [sg.start, sg.end]))) continue;
    picked.push(sg);
  }
  return picked.sort((x, y) => x.start - y.start);
}

/** "수정 적용"을 고른 제안만 반영한 교정본. 원고(text)는 바꾸지 않고 새 글을 돌려준다. */
export function applyAccepted(text: string, suggestions: Suggestion[], decisions: Record<string, Decision | undefined>): string {
  let out = text;
  for (const sg of [...suggestions].filter((x) => decisions[x.id] === 'apply').sort((a, b) => b.start - a.start)) {
    if (out.slice(sg.start, sg.end) !== sg.original) continue; // 위치가 어긋나면 건너뜀(안전)
    out = out.slice(0, sg.start) + sg.suggestion + out.slice(sg.end);
  }
  return out;
}

/**
 * 교정을 원고에 반영할 때 장면 나누기를 지킨다: 지금 장면들을 본문에서 찾아, 장면마다 그 안의 "수정 적용"만 반영한 글을 돌려준다.
 * 장면을 본문에서 순서대로 찾지 못하거나, 장면 경계에 걸친 수정이 있으면 null(규칙으로 다시 나눔).
 */
export function correctedScenes(body: string, sceneTexts: string[], suggestions: Suggestion[], decisions: Record<string, Decision | undefined>): string[] | null {
  const ranges: [number, number][] = [];
  let at = 0;
  for (const t of sceneTexts) {
    const i = body.indexOf(t, at);
    if (i < 0) return null;
    ranges.push([i, i + t.length]);
    at = i + t.length;
  }
  const applied = suggestions.filter((sg) => decisions[sg.id] === 'apply' && body.slice(sg.start, sg.end) === sg.original);
  if (applied.some((sg) => !ranges.some(([s, e]) => sg.start >= s && sg.end <= e) && ranges.some(([s, e]) => sg.start < e && sg.end > s))) return null;
  return ranges.map(([s, e]) =>
    applyAccepted(
      body.slice(s, e),
      applied.filter((sg) => sg.start >= s && sg.end <= e).map((sg) => ({ ...sg, start: sg.start - s, end: sg.end - s })),
      decisions,
    ),
  );
}

/** 유형별 건수 */
export function countByType(list: Suggestion[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const sg of list) c[sg.type] = (c[sg.type] ?? 0) + 1;
  return c;
}
