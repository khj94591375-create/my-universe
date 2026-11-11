/*
 * 올리기 전 미리보기 표에서 회차 합치기·나누기(순수 함수, 테스트 가능).
 * 원고 글자는 그대로 두고 자르는 위치만 바꾼다. sceneStarts는 본문 줄 기준 장면 시작 줄(첫 장면 제외).
 */

export type EditRow = { key: string; no: string; title: string; body: string; sceneStarts?: number[] };

/** key 회차를 바로 앞 회차 뒤에 붙인다. 붙인 자리는 새 장면이 된다 */
export function mergeRows<T extends EditRow>(list: T[], key: string): T[] {
  const i = list.findIndex((r) => r.key === key);
  if (i <= 0) return list;
  const prev = list[i - 1];
  const cur = list[i];
  // 장면을 AI·작가가 정한 회차끼리면 장면 위치를 이어 붙이고, 아니면 빈 줄 두 개로 이어 규칙 나누기가 그 자리를 장면 경계로 보게 한다
  const merged: T =
    prev.sceneStarts && cur.sceneStarts
      ? (() => {
          const offset = prev.body.split('\n').length + 1; // 사이에 빈 줄 하나
          return { ...prev, body: `${prev.body}\n\n${cur.body}`, sceneStarts: [...prev.sceneStarts!, offset, ...cur.sceneStarts!.map((n) => n + offset)] };
        })()
      : { ...prev, body: `${prev.body}\n\n\n${cur.body}`, sceneStarts: undefined };
  return [...list.slice(0, i - 1), merged, ...list.slice(i + 1)];
}

/** key 회차를 line 줄부터 새 회차로 나눈다(앞뒤 빈 줄은 정리, 장면 위치도 따라 옮김) */
export function splitRowAt<T extends EditRow>(list: T[], key: string, line: number, newKey: () => string): T[] {
  const i = list.findIndex((r) => r.key === key);
  if (i < 0) return list;
  const r = list[i];
  const lines = r.body.split('\n');
  if (line <= 0 || line >= lines.length) return list;
  const a = lines.slice(0, line);
  while (a.length && !a[a.length - 1].trim()) a.pop();
  let start = line;
  while (start < lines.length && !lines[start].trim()) start++;
  const b = lines.slice(start);
  if (!a.length || !b.length) return list;
  const starts = r.sceneStarts;
  const first: T = { ...r, body: a.join('\n'), sceneStarts: starts?.filter((n) => n < a.length) };
  const second: T = { ...r, key: newKey(), title: '', body: b.join('\n'), sceneStarts: starts?.filter((n) => n > start).map((n) => n - start) };
  return [...list.slice(0, i), first, second, ...list.slice(i + 1)];
}

/** 순서대로 번호를 다시 매긴다 */
export function renumberFrom<T extends EditRow>(list: T[], from: number): T[] {
  return list.map((r, k) => ({ ...r, no: String(from + k) }));
}

/** 본문 안에서 장면들의 위치(순서대로). 못 찾으면 null */
function sceneRanges(body: string, scenes: string[]): [number, number][] | null {
  const out: [number, number][] = [];
  let at = 0;
  for (const t of scenes) {
    const i = body.indexOf(t, at);
    if (i < 0) return null;
    out.push([i, i + t.length]);
    at = i + t.length;
  }
  return out;
}

/** 장면 i를 앞 장면과 합친다. 사이의 구분선(***)·빈 줄까지 본문 그대로 가져온다 */
export function mergeScene(body: string, scenes: string[], i: number): string[] {
  if (i <= 0 || i >= scenes.length) return scenes;
  const r = sceneRanges(body, scenes);
  const merged = r ? body.slice(r[i - 1][0], r[i][1]) : `${scenes[i - 1]}\n\n${scenes[i]}`;
  return [...scenes.slice(0, i - 1), merged, ...scenes.slice(i + 1)];
}

/** 장면 i를 그 장면의 line번째 줄부터 새 장면으로 나눈다 */
export function splitScene(scenes: string[], i: number, line: number): string[] {
  const lines = scenes[i]?.split('\n') ?? [];
  if (line <= 0 || line >= lines.length) return scenes;
  const a = lines.slice(0, line).join('\n').trim();
  const b = lines.slice(line).join('\n').trim();
  if (!a || !b) return scenes;
  return [...scenes.slice(0, i), a, b, ...scenes.slice(i + 1)];
}
