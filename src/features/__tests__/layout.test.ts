import { describe, expect, it } from 'vitest';
import type { ItemKind } from '../../data/types';
import { layoutStars } from '../map/layout';
import { LABEL_FONT, placeStarLabels } from '../map/labels';

/* 별 30·50·100개 가짜 작품(이름 길이 섞임, 관계 많음)으로 배치를 확인한다. */
const NAMES = ['리안', '세린', '검은 망토의 노인', '반쪽짜리 은열쇠', '달빛 서고의 규칙', '금서 구역', '사라진 13번째 서가', '푸른 잉크의 편지', '등불', '왕립 천문대 지하 보관실'];
export function fakeWork(n: number, linksPerStar = 2) {
  const kinds: ItemKind[] = ['character', 'setting', 'foreshadow'];
  const items = Array.from({ length: n }, (_, i) => ({ id: `s${String(i).padStart(3, '0')}`, kind: kinds[i % 3], name: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` ${i}` : ''}` }));
  const links: { a: string; b: string }[] = [];
  for (let i = 0; i < n; i++) for (let j = 1; j <= linksPerStar; j++) links.push({ a: items[i].id, b: items[(i * 7 + j * 13) % n].id });
  return { items, links: links.filter((l) => l.a !== l.b) };
}

function metrics(n: number) {
  const { items, links } = fakeWork(n);
  const t0 = performance.now();
  const pos = layoutStars(items, links);
  const ms = performance.now() - t0;
  const pts = [...pos.values()];
  const half = Math.max(...pts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))) + 80;
  // 지도 칸 620px에 맞췄을 때 1단위 = 620 / (2*half) px
  const unit = 620 / (2 * half);
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minDist = Math.min(minDist, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  const labels = (k: number) =>
    placeStarLabels(
      items.map((it, idx) => ({ id: it.id, x: pts[idx].x, y: pts[idx].y, r: 12, name: it.name, priority: 0 })),
      k * unit,
    ).size;
  return { n, ms: Math.round(ms), half: Math.round(half), minDist: Math.round(minDist), labelsFit: labels(1), labelsZoom2: labels(2), labelsZoom4: labels(4), fontPx: LABEL_FONT };
}

describe('별이 많을 때 자동 배치', () => {
  for (const n of [30, 50, 100]) {
    it(`${n}개: 별끼리 겹치지 않고, 0.5초 안, 확대하면 이름이 더 보인다`, () => {
      const m = metrics(n);
      console.log(JSON.stringify(m));
      expect(m.minDist).toBeGreaterThan(30); // 별 모양(반지름 10~16)끼리 겹치지 않음
      expect(m.ms).toBeLessThan(500);
      expect(m.labelsZoom4).toBeGreaterThanOrEqual(m.labelsFit);
    });
  }
  it('같은 데이터면 같은 배치', () => {
    const { items, links } = fakeWork(60);
    const a = layoutStars(items.map((i) => ({ ...i })), links.map((l) => ({ ...l })));
    const b = layoutStars([...items].map((i) => ({ ...i })), [...links]);
    expect([...a.values()]).toEqual([...b.values()]);
  });
});
