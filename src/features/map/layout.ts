import { forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { limits } from '../../config/limits';
import type { ItemKind } from '../../data/types';

/*
 * 우주 지도 배치(BUILD_SPEC 6.7). 중심 = 작품, 2층 = 종류 3개, 3층 = 항목(별).
 * 항목이 30개 이하면 방사형, 넘으면 force 배치로 바꾼다. [변경 가능]
 */

export type Pos = { x: number; y: number };
export const KIND_ANGLE: Record<ItemKind, number> = { character: -90, setting: 30, foreshadow: 150 };
const HUB_R = 150;
const RING_R = 390;
const RING_GAP = 130;
const SECTOR = 100; // 종류 하나가 차지하는 각도(종류 사이에 20도 빈칸)
const STAGGER = 56; // 이웃한 별의 라벨이 겹치지 않게 반지름을 엇갈림
const MAX_PER_RING = 9; // 한 고리에 이름이 짧아도 이보다 많이 담지 않음

const rad = (deg: number) => (deg * Math.PI) / 180;

export function hubPos(kind: ItemKind): Pos {
  return { x: HUB_R * Math.cos(rad(KIND_ANGLE[kind])), y: HUB_R * Math.sin(rad(KIND_ANGLE[kind])) };
}

/** 라벨 폭 어림값(겹침 방지용). */
export function labelWidth(name: string) {
  return name.length * 20 + 14;
}

// 같은 별·관계면 배치를 다시 계산하지 않는다(홈 미리보기와 지도가 같은 결과를 함께 쓴다)
const cache = new Map<string, Map<string, Pos>>();
const CACHE_MAX = 6;

export function layoutStars(items: { id: string; kind: ItemKind; name: string }[], links: { a: string; b: string }[]): Map<string, Pos> {
  const key = items.map((i) => `${i.id}:${i.kind}:${i.name}`).join('|') + '#' + links.map((l) => `${l.a}-${l.b}`).join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const out = computeLayout(items, links);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, out);
  return out;
}

function computeLayout(items: { id: string; kind: ItemKind; name: string }[], links: { a: string; b: string }[]): Map<string, Pos> {
  // 30개 이하: 이름 폭에 맞춘 촘촘한 고리 그대로. 넘으면 조금 느슨한 고리를 출발점으로 force 배치.
  if (items.length <= limits.mapRadialMax) return radial(items, 1.5);
  return forceLayout(items, links, radial(items, 2));
}

/** 종류별 부채꼴 고리 배치. roomFactor: 고리 하나에 담을 이름 폭 여유(클수록 한 고리에 많이). */
function radial(items: { id: string; kind: ItemKind; name: string }[], roomFactor: number): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  const byKind = (k: ItemKind) => items.filter((i) => i.kind === k).sort((x, y) => x.name.localeCompare(y.name));
  for (const k of Object.keys(KIND_ANGLE) as ItemKind[]) {
    // 고리마다 호 길이 안에 이름이 들어가는 만큼만 담는다(이름이 길면 바깥 고리를 더 쓴다)
    const rings: (typeof items)[] = [];
    let cur: typeof items = [];
    let used = 0;
    for (const it of byKind(k)) {
      const r = RING_R + rings.length * RING_GAP;
      const room = rad(SECTOR) * (r + STAGGER / 2) * roomFactor; // 엇갈림 두 줄이라 호 길이의 두 배
      const w = labelWidth(it.name) + 16;
      if (cur.length && (used + w > room || cur.length >= MAX_PER_RING)) {
        rings.push(cur);
        cur = [];
        used = 0;
      }
      cur.push(it);
      used += w;
    }
    if (cur.length) rings.push(cur);
    rings.forEach((list, ring) => {
      const inRing = list.length;
      const step = inRing > 1 ? SECTOR / (inRing - 1) : 0;
      const offset = ring % 2 && inRing > 1 ? step / 2 : 0; // 바깥 고리는 반 칸 엇갈리게
      list.forEach((it, slot) => {
        const deg = KIND_ANGLE[k] - (inRing > 1 ? SECTOR / 2 : 0) + slot * step + offset;
        const r = RING_R + ring * RING_GAP + (slot % 2 ? STAGGER : 0);
        pos.set(it.id, { x: r * Math.cos(rad(deg)), y: r * Math.sin(rad(deg)) });
      });
    });
  }
  return pos;
}

type Node = SimulationNodeDatum & { id: string; w: number };

function forceLayout(items: { id: string; kind: ItemKind; name: string }[], links: { a: string; b: string }[], start: Map<string, Pos>) {
  const n = items.length;
  const hubs: Node[] = (Object.keys(KIND_ANGLE) as ItemKind[]).map((k) => ({ id: `hub:${k}`, w: 60, fx: hubPos(k).x, fy: hubPos(k).y }));
  const nodes: Node[] = items.map((i) => ({ id: i.id, w: labelWidth(i.name), ...start.get(i.id) }));
  const ids = new Set(items.map((i) => i.id));
  const real = links.filter((l) => ids.has(l.a) && ids.has(l.b) && l.a !== l.b);
  // 관계가 많은 별일수록 선을 짧게(관계 밀도), 별이 많을수록 밀어내는 힘을 약하게(전체가 끝없이 커지지 않게)
  const degree = new Map<string, number>();
  for (const l of real) {
    degree.set(l.a, (degree.get(l.a) ?? 0) + 1);
    degree.set(l.b, (degree.get(l.b) ?? 0) + 1);
  }
  const deg = (id: string) => Math.max(1, degree.get(id) ?? 0);
  const edges = [
    ...items.map((i) => ({ source: i.id, target: `hub:${i.kind}`, d: 260 })),
    ...real.map((l) => ({ source: l.a, target: l.b, d: 120 + 90 / Math.sqrt(Math.min(deg(l.a), deg(l.b))) })),
  ];
  const charge = -340 * Math.min(1, Math.pow(30 / n, 0.8));
  const sim = forceSimulation<Node>([...hubs, ...nodes])
    .force('link', forceLink<Node, { source: string; target: string; d: number }>(edges).id((nd) => nd.id).distance((e) => e.d).strength(0.3))
    .force('charge', forceManyBody().strength(charge))
    // 이름은 가로로 길어서, 원 모양 충돌 반지름을 이름 폭의 절반 대신 조금 작게(남는 겹침은 이름 표시 규칙이 처리)
    .force('collide', forceCollide<Node>((nd) => nd.w * 0.5 + 16).iterations(2))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  return new Map(nodes.map((nd) => [nd.id, { x: nd.x ?? 0, y: nd.y ?? 0 }]));
}

/** 별 밝기: gap이 클수록 희미하게(최소 0.35). */
export function starOpacity(gap: number | null, maxGap: number): number {
  if (gap == null || gap <= 0 || maxGap <= 0) return 1;
  return Math.max(limits.starMinOpacity, 1 - (gap / maxGap) * (1 - limits.starMinOpacity));
}
