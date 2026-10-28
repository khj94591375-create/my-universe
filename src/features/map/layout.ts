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
const RING_R = 330;
const RING_GAP = 110;
const SECTOR = 88; // 종류 하나가 차지하는 각도(종류 사이에 32도 빈칸)
const STAGGER = 48; // 이웃한 별의 라벨이 겹치지 않게 반지름을 엇갈림
const PER_RING = 7;

const rad = (deg: number) => (deg * Math.PI) / 180;

export function hubPos(kind: ItemKind): Pos {
  return { x: HUB_R * Math.cos(rad(KIND_ANGLE[kind])), y: HUB_R * Math.sin(rad(KIND_ANGLE[kind])) };
}

/** 라벨 폭 어림값(겹침 방지용). */
export function labelWidth(name: string) {
  return name.length * 20 + 14;
}

export function layoutStars(items: { id: string; kind: ItemKind; name: string }[], links: { a: string; b: string }[]): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  const byKind = (k: ItemKind) => items.filter((i) => i.kind === k).sort((x, y) => x.name.localeCompare(y.name));
  for (const k of Object.keys(KIND_ANGLE) as ItemKind[]) {
    const list = byKind(k);
    list.forEach((it, idx) => {
      const ring = Math.floor(idx / PER_RING);
      const inRing = Math.min(PER_RING, list.length - ring * PER_RING);
      const slot = idx % PER_RING;
      const step = inRing > 1 ? SECTOR / (inRing - 1) : 0;
      const offset = ring % 2 ? step / 2 : 0; // 바깥 고리는 반 칸 엇갈리게
      const deg = KIND_ANGLE[k] - (inRing > 1 ? SECTOR / 2 : 0) + slot * step + offset * (inRing > 1 ? 1 : 0);
      const r = RING_R + ring * RING_GAP + (slot % 2 ? STAGGER : 0);
      pos.set(it.id, { x: r * Math.cos(rad(deg)), y: r * Math.sin(rad(deg)) });
    });
  }
  if (items.length <= limits.mapRadialMax) return pos;
  return forceLayout(items, links, pos);
}

type Node = SimulationNodeDatum & { id: string; w: number };

function forceLayout(items: { id: string; kind: ItemKind; name: string }[], links: { a: string; b: string }[], start: Map<string, Pos>) {
  const hubs: Node[] = (Object.keys(KIND_ANGLE) as ItemKind[]).map((k) => ({ id: `hub:${k}`, w: 60, fx: hubPos(k).x, fy: hubPos(k).y }));
  const nodes: Node[] = items.map((i) => ({ id: i.id, w: labelWidth(i.name), ...start.get(i.id) }));
  const ids = new Set(items.map((i) => i.id));
  const edges = [
    ...items.map((i) => ({ source: i.id, target: `hub:${i.kind}`, d: 220 })),
    ...links.filter((l) => ids.has(l.a) && ids.has(l.b)).map((l) => ({ source: l.a, target: l.b, d: 160 })),
  ];
  const sim = forceSimulation<Node>([...hubs, ...nodes])
    .force('link', forceLink<Node, { source: string; target: string; d: number }>(edges).id((n) => n.id).distance((e) => e.d).strength(0.3))
    .force('charge', forceManyBody().strength(-260))
    .force('collide', forceCollide<Node>((n) => n.w / 2 + 6))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  return new Map(nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

/** 별 밝기: gap이 클수록 희미하게(최소 0.35). */
export function starOpacity(gap: number | null, maxGap: number): number {
  if (gap == null || gap <= 0 || maxGap <= 0) return 1;
  return Math.max(limits.starMinOpacity, 1 - (gap / maxGap) * (1 - limits.starMinOpacity));
}
