/*
 * 회차 번호 찾기와 여러 회차 나누기(BUILD_SPEC 7.5). 파일 종류와 상관없이 뽑아낸 글자에 쓴다.
 */

export type ParsedEpisode = {
  /** 찾은 회차 번호. 못 찾으면 null(화면에서 다음 번호를 제안) */
  no: number | null;
  /** 회차 표시 줄에서 번호를 뺀 나머지. 없으면 '' (저장할 때 "N화") */
  title: string;
  body: string;
};

/** 회차 표시 줄: "1화", "제 1 화", "12화 등불이 켜진 밤", "3화. 제목" */
const HEADER = /^\s*(?:제\s*)?(\d+)\s*화(?![가-힣])\s*[.\-:·)\]]?\s*(.*)$/;
const MAX_HEADER = 50;

function headerOf(line: string): { no: number; title: string } | null {
  if (line.trim().length > MAX_HEADER) return null;
  const m = HEADER.exec(line);
  return m ? { no: Number(m[1]), title: m[2].trim() } : null;
}

function clean(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** 파일 하나의 글자를 회차들로 나눈다. */
export function parseManuscript(fileName: string, rawText: string): ParsedEpisode[] {
  const text = clean(rawText);
  const lines = text.split('\n');
  const heads = lines.map((l, i) => ({ i, h: headerOf(l) })).filter((x) => x.h);

  // 회차 표시 줄이 2개 이상이면 그 줄을 기준으로 나눈다
  if (heads.length >= 2) {
    const out: ParsedEpisode[] = [];
    const preamble = lines.slice(0, heads[0].i).join('\n').trim();
    heads.forEach((x, k) => {
      const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
      let body = lines.slice(x.i + 1, end).join('\n').trim();
      // 첫 회차 앞 글이 길면(작품 소개가 아니라 본문이면) 버리지 않고 첫 회차에 붙인다
      if (k === 0 && preamble.length > 100) body = `${preamble}\n\n${body}`;
      out.push({ no: x.h!.no, title: x.h!.title, body });
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

/** 파일 이름에서 확장자(소문자). */
export function extOf(fileName: string): string {
  const m = /\.([^.]+)$/.exec(fileName);
  return m ? m[1].toLowerCase() : '';
}
