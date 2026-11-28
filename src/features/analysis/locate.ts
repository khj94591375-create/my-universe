/*
 * 근거 문장을 회차 본문에서 찾아 앞뒤 원문을 붙인다(근거가 짧아 맥락이 안 보일 때).
 * 공백·줄바꿈 차이, 따옴표 모양(“ ” ‘ ’ 「 」 → " '), 말줄임(... → …) 차이는 같은 글자로 본다.
 * 뒤를 돌아보는 정규식은 쓰지 않는다(일부 브라우저가 지원하지 않음).
 */

const QUOTE: Record<string, string> = { '“': '"', '”': '"', '„': '"', '‘': "'", '’': "'", '「': '"', '」': '"', '『': '"', '』': '"' };

/** 비교용 글자와, 그 글자가 원래 본문의 몇 번째 글자였는지 */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let space = false;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (/\s/.test(ch)) {
      if (!space && norm.length) {
        norm += ' ';
        map.push(i);
      }
      space = true;
      continue;
    }
    space = false;
    if (ch === '.' && text.startsWith('...', i)) {
      norm += '…';
      map.push(i);
      i += 2;
      continue;
    }
    ch = QUOTE[ch] ?? ch;
    norm += ch;
    map.push(i);
  }
  return { norm: norm.trimEnd(), map };
}

/** 찾을 글: 그대로(앞뒤 말줄임만 뗌) → 못 찾으면 앞뒤 따옴표까지 떼고(근거를 줄이며 붙인 … 때문에 못 찾지 않게) */
function needles(ev: string): string[] {
  const n = normalizeWithMap(ev).norm.replace(/^[\s…]+/, '').replace(/[\s…]+$/, '');
  const bare = n.replace(/^["']+/, '').replace(/["']+$/, '');
  return bare === n ? [n] : [n, bare];
}

/** 본문에서 근거가 있는 자리 [시작, 끝). 없으면 null */
export function locateEvidence(body: string, evidence: string): { start: number; end: number } | null {
  const { norm, map } = normalizeWithMap(body);
  let needle = '';
  let at = -1;
  for (const n of needles(evidence)) {
    if ([...n].length < 4) continue;
    at = norm.indexOf(n);
    needle = n;
    if (at >= 0) break;
  }
  if (at < 0) return null;
  const start = map[at];
  const last = map[at + needle.length - 1];
  // 마지막 글자가 "..."로 바꾼 …였다면 원문 세 글자를 모두 포함
  const end = body.startsWith('...', last) && norm[at + needle.length - 1] === '…' ? last + 3 : last + 1;
  return { start, end };
}

/** 문장 끝: 마침표·물음표·느낌표·말줄임(+닫는 따옴표) 뒤 공백, 또는 줄바꿈 */
const END = /[.!?…]["'”’」』)]*\s+|\n+/g;

function sentenceStarts(text: string): number[] {
  const out = [0];
  END.lastIndex = 0;
  for (let m = END.exec(text); m; m = END.exec(text)) {
    const at = m.index + m[0].length;
    if (at < text.length) out.push(at);
  }
  return out;
}

/** 앞 n문장(최대 max자)·근거·뒤 n문장(최대 max자). 잘린 쪽은 cutBefore/cutAfter */
export function contextAround(body: string, start: number, end: number, n = 2, max = 300) {
  const beforeAll = body.slice(0, start);
  const starts = sentenceStarts(beforeAll);
  let from = starts[Math.max(0, starts.length - n)];
  if (start - from > max) from = start - max;
  const afterAll = body.slice(end);
  END.lastIndex = 0;
  let to = afterAll.length;
  let count = 0;
  for (let m = END.exec(afterAll); m; m = END.exec(afterAll)) {
    // 근거 바로 뒤에 붙은 문장 끝(같은 문장의 나머지)은 세지 않는다
    if (m.index > 0) count++;
    if (count >= n) {
      to = m.index + m[0].trimEnd().length;
      break;
    }
  }
  if (to > max) to = max;
  return {
    before: body.slice(from, start),
    match: body.slice(start, end),
    after: afterAll.slice(0, to),
    cutBefore: from > 0,
    cutAfter: end + to < body.length,
  };
}
