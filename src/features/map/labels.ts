/*
 * 우주 지도 이름표 배치: 겹치지 않게, 중요한 이름부터. [변경 가능: 숫자]
 * 이름 글자는 확대 배율과 상관없이 화면에서 같은 크기로 그린다(지도 좌표로는 1/k 크기).
 * 그래서 확대할수록 별 사이가 넓어지고 더 많은 이름이 들어간다.
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };

/**
 * 지도에 그릴 짧은 이름: max 글자를 넘으면 말줄임(…). 가능하면 띄어쓰기 경계에서 자르고,
 * 그렇게 자르면 너무 짧아질 때(절반 미만)는 글자 수로 자른다. 글자 수는 이모지도 한 글자로 센다.
 */
export function shortLabel(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const chars = [...t];
  if (chars.length <= max) return t;
  const head = chars.slice(0, max - 1).join('');
  // 자른 자리 바로 뒤가 띄어쓰기면 마지막 낱말이 온전히 들어간 것
  if (chars[max - 1] === ' ') return `${head.trimEnd()}…`;
  const sp = head.lastIndexOf(' ');
  const cut = sp >= Math.ceil((max - 1) / 2) ? head.slice(0, sp) : head;
  return `${cut.trimEnd()}…`;
}

export const LABEL_FONT = 17; // 화면에서 보이는 별 이름 글자 크기(px)
export const LINK_FONT = 15; // 관계 이름 글자 크기(px)

/** 글자 수로 어림한 이름 상자 크기(지도 좌표). 한글 한 글자 ≈ 글자 크기. */
export function textBox(cx: number, cy: number, text: string, font: number): Box {
  const w = [...text].length * font * 0.98 + font * 0.5;
  const h = font * 1.3;
  return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
}

/**
 * 가리킨 별 이름표(잠깐 위에 뜨는 상자)용 줄바꿈: 한 줄 maxChars 글자, 띄어쓰기 경계 우선, 최대 maxLines줄(넘치면 말줄임).
 * 지도 위 별 이름은 줄바꿈하지 않는다(겹침 방지) — 이건 잠깐 덮어 보이는 이름표에만 쓴다.
 */
export function wrapLines(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  const lines: string[] = [];
  let cur = '';
  const push = (w: string) => {
    // 한 낱말이 한 줄보다 길면 글자 수로 쪼갠다
    let rest = [...w];
    while (rest.length > maxChars) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push(rest.slice(0, maxChars).join(''));
      rest = rest.slice(maxChars);
    }
    const piece = rest.join('');
    if (!cur) cur = piece;
    else if ([...cur].length + 1 + rest.length <= maxChars) cur = `${cur} ${piece}`;
    else {
      lines.push(cur);
      cur = piece;
    }
  };
  for (const w of words) push(w);
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${[...kept[maxLines - 1]].slice(0, Math.max(1, maxChars - 1)).join('')}…`;
  return kept;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function circleBox(x: number, y: number, r: number): Box {
  return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
}

/** 겹침 검사를 빠르게: 지도를 칸으로 나눠 가까운 상자끼리만 비교한다(별이 많아도 빠름). */
class BoxGrid {
  private cells = new Map<string, Box[]>();
  constructor(private size: number) {}
  private keys(b: Box): string[] {
    const out: string[] = [];
    const x0 = Math.floor(b.x0 / this.size);
    const x1 = Math.floor(b.x1 / this.size);
    const y0 = Math.floor(b.y0 / this.size);
    const y1 = Math.floor(b.y1 / this.size);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(`${x},${y}`);
    return out;
  }
  add(b: Box) {
    for (const k of this.keys(b)) {
      const list = this.cells.get(k);
      if (list) list.push(b);
      else this.cells.set(k, [b]);
    }
  }
  /** b와 겹치는 상자가 있나(except 상자는 빼고) */
  hits(b: Box, except?: Box): boolean {
    for (const k of this.keys(b)) for (const o of this.cells.get(k) ?? []) if (o !== except && overlaps(b, o)) return true;
    return false;
  }
}

export type StarLabelInput = { id: string; x: number; y: number; r: number; name: string; priority: number; force?: boolean };

/**
 * 별 이름 위치 정하기(욕심쟁이 배치). 우선순위가 높은 이름부터 놓고, 이미 놓인 이름·별·막힌 곳과 겹치면 숨긴다.
 * force인 이름(고른 별·가리킨 별)은 겹쳐도 보여 준다.
 * k = 확대 배율(이름 상자를 1/k로 줄여 계산).
 */
export function placeStarLabels(stars: StarLabelInput[], k: number, blocked: Box[] = []): Map<string, Box> {
  const f = LABEL_FONT / k;
  const cell = f * 8;
  // 별·막힌 곳·이미 놓은 이름을 칸별로 기억
  const starGrid = new BoxGrid(cell);
  const starBox = new Map<string, Box>();
  for (const st of stars) {
    const b = circleBox(st.x, st.y, st.r);
    starBox.set(st.id, b);
    starGrid.add(b);
  }
  const blockGrid = new BoxGrid(cell);
  blocked.forEach((b) => blockGrid.add(b));
  const labelGrid = new BoxGrid(cell);
  const placed = new Map<string, Box>();
  const order = [...stars].sort((a, b) => Number(Boolean(b.force)) - Number(Boolean(a.force)) || b.priority - a.priority || a.name.localeCompare(b.name));
  for (const st of order) {
    const box = textBox(st.x, st.y + st.r + f * 0.95, st.name, f);
    // 자기 별과 겹치는 건 괜찮다: 자기 별을 뺀 나머지 별과만 비교
    const hitsStar = starGrid.hits(box, starBox.get(st.id));
    if (st.force || (!hitsStar && !labelGrid.hits(box) && !blockGrid.hits(box))) {
      placed.set(st.id, box);
      labelGrid.add(box);
    }
  }
  return placed;
}

export type LinkLabelInput = { id: string; text: string; at: (t: number) => { x: number; y: number }; force?: boolean };

/** 관계 이름 위치: 곡선 위 여러 지점 중 이름·별과 안 겹치는 곳. 자리가 없으면 숨김(force면 가운데에). */
export function placeLinkLabels(links: LinkLabelInput[], k: number, taken: Box[]): Map<string, { x: number; y: number }> {
  const f = LINK_FONT / k;
  const used = new BoxGrid(f * 8);
  taken.forEach((b) => used.add(b));
  const out = new Map<string, { x: number; y: number }>();
  const order = [...links].sort((a, b) => Number(Boolean(b.force)) - Number(Boolean(a.force)));
  for (const l of order) {
    let spot: { x: number; y: number } | null = null;
    for (const t of [0.5, 0.38, 0.62, 0.28, 0.72]) {
      const p = l.at(t);
      const box = textBox(p.x, p.y, l.text, f);
      if (!used.hits(box)) {
        spot = p;
        used.add(box);
        break;
      }
    }
    if (!spot && l.force) {
      spot = l.at(0.5);
      used.add(textBox(spot.x, spot.y, l.text, f));
    }
    if (spot) out.set(l.id, spot);
  }
  return out;
}
