/*
 * 우주 지도 이름표 배치: 겹치지 않게, 중요한 이름부터. [변경 가능: 숫자]
 * 이름 글자는 확대 배율과 상관없이 화면에서 같은 크기로 그린다(지도 좌표로는 1/k 크기).
 * 그래서 확대할수록 별 사이가 넓어지고 더 많은 이름이 들어간다.
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };

export const LABEL_FONT = 17; // 화면에서 보이는 별 이름 글자 크기(px)
export const LINK_FONT = 15; // 관계 이름 글자 크기(px)

/** 글자 수로 어림한 이름 상자 크기(지도 좌표). 한글 한 글자 ≈ 글자 크기. */
export function textBox(cx: number, cy: number, text: string, font: number): Box {
  const w = [...text].length * font * 0.98 + font * 0.5;
  const h = font * 1.3;
  return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function circleBox(x: number, y: number, r: number): Box {
  return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
}

export type StarLabelInput = { id: string; x: number; y: number; r: number; name: string; priority: number; force?: boolean };

/**
 * 별 이름 위치 정하기(욕심쟁이 배치). 우선순위가 높은 이름부터 놓고, 이미 놓인 이름·별·막힌 곳과 겹치면 숨긴다.
 * force인 이름(고른 별·가리킨 별)은 겹쳐도 보여 준다.
 * k = 확대 배율(이름 상자를 1/k로 줄여 계산).
 */
export function placeStarLabels(stars: StarLabelInput[], k: number, blocked: Box[] = []): Map<string, Box> {
  const f = LABEL_FONT / k;
  const starBoxes = new Map(stars.map((s) => [s.id, circleBox(s.x, s.y, s.r)]));
  const placed = new Map<string, Box>();
  const order = [...stars].sort((a, b) => Number(Boolean(b.force)) - Number(Boolean(a.force)) || b.priority - a.priority || a.name.localeCompare(b.name));
  for (const s of order) {
    const box = textBox(s.x, s.y + s.r * 1 + f * 0.95, s.name, f);
    const hitsStar = [...starBoxes].some(([id, b]) => id !== s.id && overlaps(box, b));
    const hitsLabel = [...placed.values()].some((b) => overlaps(box, b));
    const hitsBlocked = blocked.some((b) => overlaps(box, b));
    if (s.force || (!hitsStar && !hitsLabel && !hitsBlocked)) placed.set(s.id, box);
  }
  return placed;
}

export type LinkLabelInput = { id: string; text: string; at: (t: number) => { x: number; y: number }; force?: boolean };

/** 관계 이름 위치: 곡선 위 여러 지점 중 이름·별과 안 겹치는 곳. 자리가 없으면 숨김(force면 가운데에). */
export function placeLinkLabels(links: LinkLabelInput[], k: number, taken: Box[]): Map<string, { x: number; y: number }> {
  const f = LINK_FONT / k;
  const used = [...taken];
  const out = new Map<string, { x: number; y: number }>();
  const order = [...links].sort((a, b) => Number(Boolean(b.force)) - Number(Boolean(a.force)));
  for (const l of order) {
    let spot: { x: number; y: number } | null = null;
    for (const t of [0.5, 0.38, 0.62, 0.28, 0.72]) {
      const p = l.at(t);
      const box = textBox(p.x, p.y, l.text, f);
      if (!used.some((b) => overlaps(box, b))) {
        spot = p;
        used.push(box);
        break;
      }
    }
    if (!spot && l.force) {
      spot = l.at(0.5);
      used.push(textBox(spot.x, spot.y, l.text, f));
    }
    if (spot) out.set(l.id, spot);
  }
  return out;
}
