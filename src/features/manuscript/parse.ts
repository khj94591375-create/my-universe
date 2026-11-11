/*
 * 회차 번호 찾기와 여러 회차 나누기(BUILD_SPEC 7.5). 파일 종류와 상관없이 뽑아낸 글자에 쓴다.
 */

export type ParsedEpisode = {
  /** 찾은 회차 번호. 못 찾으면 null(화면에서 다음 번호를 제안) */
  no: number | null;
  /** 회차 표시 줄에서 번호를 뺀 나머지. 없으면 '' (저장할 때 "N화") */
  title: string;
  body: string;
  /** AI가 나눈 장면: body를 줄로 나눴을 때 새 장면이 시작되는 줄 위치(첫 장면은 빼고). 없으면 규칙으로 나눈다 */
  sceneStarts?: number[];
};

/** 회차 표시 줄: "1화", "제 1 화", "12화 등불이 켜진 밤", "3화. 제목" */
const HEADER = /^\s*(?:제\s*)?(\d+)\s*화(?![가-힣])\s*[.\-:·)\]]?\s*(.*)$/;
const MAX_HEADER = 50;

function headerOf(line: string): { no: number; title: string } | null {
  if (line.trim().length > MAX_HEADER) return null;
  const m = HEADER.exec(line);
  return m ? { no: Number(m[1]), title: m[2].trim() } : null;
}

/**
 * "N화"가 없을 때 쓰는 다른 회차 표시(짧은 한 줄일 때만):
 * "1장", "제1장", "Chapter 1", "Ch. 1", "Episode 1", "EP.1", "#1", "1.", "[1]", "<1>", "1" 하나만, "프롤로그"·"에필로그"·"외전"
 */
const ALT_HEADERS: RegExp[] = [
  /^\s*(?:제\s*)?(\d+)\s*장(?![가-힣])\s*[.\-:·)\]]?\s*(.*)$/,
  /^\s*(?:chapter|ch\.?|episode|ep\.?)\s*(\d+)\s*[.\-:)\]]?\s*(.*)$/i,
  /^\s*#\s*(\d+)\s*[.\-:)]?\s*(.*)$/,
  /^\s*[[<〈《【(]\s*(\d+)\s*[\]>〉》】)]\s*(.*)$/,
  /^\s*(\d+)\s*[.)]\s*(.{0,30})$/,
  /^\s*(\d+)\s*$/,
];
const SPECIAL = /^\s*(프롤로그|에필로그|외전|prologue|epilogue)\s*[.\-:·]?\s*(.*)$/i;
const MAX_ALT_HEADER = 40;
/** 다른 표시로 나눌 때 회차 본문이 이보다 짧은 게 있으면 목록 번호 등으로 보고 쓰지 않는다 */
const MIN_ALT_BODY = 100;

type Head = { i: number; no: number | null; title: string; raw?: string };

function altHeads(lines: string[]): Head[] | null {
  for (const re of ALT_HEADERS) {
    const heads: Head[] = [];
    lines.forEach((l, i) => {
      if (l.trim().length > MAX_ALT_HEADER) return;
      const m = re.exec(l);
      if (m) heads.push({ i, no: Number(m[1]), title: (m[2] ?? '').trim(), raw: l.trim() });
      else {
        const sp = SPECIAL.exec(l);
        if (sp) heads.push({ i, no: null, title: '', raw: l.trim() });
      }
    });
    if (heads.filter((h) => h.no != null).length < 2) continue;
    // 회차마다 본문이 충분히 길어야 한다(본문 속 번호 목록 오인 방지)
    const ok = heads.every((h, k) => {
      const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
      return lines.slice(h.i + 1, end).join('\n').trim().length >= MIN_ALT_BODY;
    });
    if (ok) return heads;
  }
  return null;
}

/** 번호가 늘어나기만 하면 그 번호로, 아니면(프롤로그가 있거나 번호가 겹치면) 순서대로 1, 2, 3 … 제목은 원래 표시 줄("1장", "프롤로그") */
function numberHeads(heads: Head[]): Head[] {
  const nums = heads.map((h) => h.no);
  const increasing = nums.every((n) => n != null) && nums.every((n, k) => k === 0 || n! > nums[k - 1]!);
  return heads.map((h, k) => ({ ...h, no: increasing ? h.no : k + 1, title: h.raw ?? h.title }));
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** 파일 하나의 글자를 회차들로 나눈다. */
export function parseManuscript(fileName: string, rawText: string): ParsedEpisode[] {
  const text = cleanText(rawText);
  const lines = text.split('\n');
  const heads = lines.map((l, i) => ({ i, h: headerOf(l) })).filter((x) => x.h);

  // 회차 표시 줄("N화")이 2개 이상이면 그 줄을 기준으로, 없으면 다른 표시("1장", "Chapter 1", "#1", "프롤로그" …)로 나눈다
  const split: Head[] | null = heads.length >= 2 ? heads.map((x) => ({ i: x.i, no: x.h!.no, title: x.h!.title })) : (() => {
    const alt = altHeads(lines);
    return alt ? numberHeads(alt) : null;
  })();
  if (split) {
    const out: ParsedEpisode[] = [];
    const preamble = lines.slice(0, split[0].i).join('\n').trim();
    split.forEach((x, k) => {
      const end = k + 1 < split.length ? split[k + 1].i : lines.length;
      let body = lines.slice(x.i + 1, end).join('\n').trim();
      // 첫 회차 앞 글이 길면(작품 소개가 아니라 본문이면) 버리지 않고 첫 회차에 붙인다
      if (k === 0 && preamble.length > 100) body = `${preamble}\n\n${body}`;
      out.push({ no: x.no, title: x.title, body });
    });
    return out.filter((e) => e.body);
  }

  // 회차 하나: 파일명 → 첫 줄 → "제 N 화" 순서로 번호를 찾는다
  const firstIdx = lines.findIndex((l) => l.trim());
  const first = firstIdx >= 0 ? headerOf(lines[firstIdx]) : null;
  const fromName = /(\d+)\s*화/.exec(fileName);
  const fromFirst = firstIdx >= 0 ? /(\d+)\s*화/.exec(lines[firstIdx]) : null;
  const fromJe = /제\s*(\d+)\s*화/.exec(text);
  const no = fromName ? Number(fromName[1]) : fromFirst ? Number(fromFirst[1]) : fromJe ? Number(fromJe[1]) : null;
  // 첫 줄이 회차 표시 줄이면 제목으로 쓰고 본문에서 뺀다
  const body = first ? lines.slice(firstIdx + 1).join('\n').trim() : text;
  return body ? [{ no, title: first?.title ?? '', body }] : [];
}

/**
 * AI가 고른 회차 시작 줄(과 장면 시작 줄)로 나눈다. 원고 글자는 그대로, 자르는 위치만. text는 cleanText를 거친 글자.
 * 시작 줄이 제목 줄(heading)이면 본문에서 빼고 제목으로 쓴다. 첫 회차 앞 글은 규칙 나누기와 같이(길면 첫 회차에 붙임).
 */
export function splitByStarts(text: string, starts: { line: number; title: string; heading: boolean; no: number | null; scenes?: number[] }[]): ParsedEpisode[] {
  const lines = text.split('\n');
  if (starts.length === 0) return text.trim() ? [{ no: null, title: '', body: text.trim() }] : [];
  const preText = lines.slice(0, starts[0].line).join('\n').trim();
  const out: ParsedEpisode[] = starts.map((st, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].line : lines.length;
    let abs = st.heading ? st.line + 1 : st.line;
    const seg = lines.slice(abs, end);
    while (seg.length && !seg[0].trim()) {
      seg.shift();
      abs++;
    }
    while (seg.length && !seg[seg.length - 1].trim()) seg.pop();
    const prefix = k === 0 && preText.length > 100 ? [...preText.split('\n'), ''] : [];
    const sceneStarts = (st.scenes ?? []).filter((l) => l > abs && l < abs + seg.length).map((l) => l - abs + prefix.length);
    const title = st.title || (st.heading ? lines[st.line].trim() : '');
    return { no: st.no, title, body: [...prefix, ...seg].join('\n').trim(), ...(st.scenes ? { sceneStarts } : {}) };
  });
  return out.filter((e) => e.body);
}

/** 본문과 장면 시작 줄로 장면 글자 목록을 만든다(빈 장면은 뺌). */
export function scenesOf(body: string, sceneStarts: number[]): string[] {
  const lines = body.split('\n');
  const cuts = [0, ...[...new Set(sceneStarts)].filter((n) => n > 0 && n < lines.length).sort((a, b) => a - b), lines.length];
  const out: string[] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const t = lines.slice(cuts[k], cuts[k + 1]).join('\n').trim();
    if (t) out.push(t);
  }
  return out;
}

/** 파일 이름에서 확장자(소문자). */
export function extOf(fileName: string): string {
  const m = /\.([^.]+)$/.exec(fileName);
  return m ? m[1].toLowerCase() : '';
}
