/*
 * AI 회차 나누기: 원고 줄에 번호를 붙여 보내고, AI가 고른 "회차 시작 줄"만 검사해서 돌려준다.
 * 원고 글자는 바꾸지 않는다(자르는 위치만). 브라우저 테스트와 Deno가 함께 쓴다.
 */

/** 빈 줄이 아닌 줄에만 번호(1부터)를 붙인다. map[번호-1] = 원래 줄 위치(0부터) */
export function numberLines(text: string): { numbered: string; map: number[] } {
  const lines = text.split('\n');
  const map: number[] = [];
  const out: string[] = [];
  lines.forEach((l, i) => {
    if (!l.trim()) return;
    map.push(i);
    out.push(`[${map.length}] ${l}`);
  });
  return { numbered: out.join('\n'), map };
}

export type RawStart = { start_line: number; title: string; heading: boolean; no: number; scene_lines?: number[] };
/** line·scenes는 원래 줄 위치(0부터). scenes: 이 회차 안에서 새 장면이 시작되는 줄(회차 첫 장면은 빼고) */
export type SplitStart = { line: number; title: string; heading: boolean; no: number | null; scenes: number[] };

/** AI가 준 시작 줄을 검사: 범위 밖·중복은 버리고 순서대로. 첫 회차 앞 글은 화면이 규칙 나누기와 같은 방식으로 처리한다 */
export function checkStarts(raw: RawStart[], map: number[], maxEpisodes = 200): SplitStart[] {
  const seen = new Set<number>();
  const list = raw
    .filter((r) => Number.isInteger(r.start_line) && r.start_line >= 1 && r.start_line <= map.length)
    .sort((a, b) => a.start_line - b.start_line)
    .filter((r) => (seen.has(r.start_line) ? false : (seen.add(r.start_line), true)))
    .slice(0, maxEpisodes)
    .map((r) => ({ start: r.start_line, scenes: r.scene_lines ?? [], line: map[r.start_line - 1], title: r.title.trim().slice(0, 80), heading: Boolean(r.heading), no: Number.isInteger(r.no) && r.no > 0 ? r.no : null }));
  if (list.length === 0) return map.length ? [{ line: map[0], title: '', heading: false, no: null, scenes: [] }] : [];
  // 장면 시작 줄: 이 회차 범위 안(회차 시작 줄과 제목 줄 다음 줄은 빼고), 순서대로, 중복 없이
  return list.map((st, k) => {
    const end = k + 1 < list.length ? list[k + 1].start : map.length + 1;
    const first = st.heading ? st.start + 1 : st.start;
    const scenes = [...new Set(st.scenes.filter((n) => Number.isInteger(n) && n > first && n < end))].sort((a, b) => a - b).map((n) => map[n - 1]);
    return { line: st.line, title: st.title, heading: st.heading, no: st.no, scenes };
  });
}
