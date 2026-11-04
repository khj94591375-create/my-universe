import { describe, expect, it } from 'vitest';
import { overlaps, placeLinkLabels, placeStarLabels, type StarLabelInput } from '../map/labels';

// 가로로 촘촘히 늘어선 별 20개
const row: StarLabelInput[] = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, x: i * 60, y: 0, r: 10, name: `별이름${i}`, priority: i }));

describe('별 이름 배치', () => {
  it('보이는 이름끼리는 겹치지 않는다', () => {
    const boxes = [...placeStarLabels(row, 1).values()];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j])).toBe(false);
  });
  it('확대할수록 더 많은 이름이 보인다', () => {
    const at1 = placeStarLabels(row, 1).size;
    const at2 = placeStarLabels(row, 2.5).size;
    expect(at2).toBeGreaterThan(at1);
  });
  it('우선순위가 높은 이름이 먼저, 고른 별은 겹쳐도 보인다', () => {
    const shown = placeStarLabels(row, 1);
    expect(shown.has('s19')).toBe(true);
    const forced = placeStarLabels(row.map((s) => (s.id === 's0' ? { ...s, force: true } : s)), 1);
    expect(forced.has('s0')).toBe(true);
  });
});

describe('관계 이름 배치', () => {
  const line = (x0: number, x1: number, y: number) => (t: number) => ({ x: x0 + (x1 - x0) * t, y });
  it('이미 있는 이름을 피해 곡선 위 다른 자리를 찾는다', () => {
    const taken = [{ x0: 80, y0: -10, x1: 120, y1: 10 }]; // 가운데(100,0)를 막음
    const out = placeLinkLabels([{ id: 'l', text: '스승', at: line(0, 200, 0) }], 1, taken);
    expect(out.get('l')?.x).not.toBe(100);
  });
  it('자리가 없으면 숨기고, 강조한 선은 그래도 보인다', () => {
    const wall = [{ x0: -1000, y0: -1000, x1: 1000, y1: 1000 }];
    expect(placeLinkLabels([{ id: 'l', text: '스승', at: line(0, 200, 0) }], 1, wall).has('l')).toBe(false);
    expect(placeLinkLabels([{ id: 'l', text: '스승', at: line(0, 200, 0), force: true }], 1, wall).has('l')).toBe(true);
  });
});
