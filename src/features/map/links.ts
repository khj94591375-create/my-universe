import type { Link } from '../../data/types';

/*
 * 연결선 방향 계산. DB에는 a < b로 정렬해 저장하고 방향은 direction 칸에 둔다.
 */

/** 화살표의 시작(from)과 끝(to). 방향이 없으면 directed = false(a, b 순서). */
export function linkEnds(link: Pick<Link, 'a' | 'b' | 'direction'>): { from: string; to: string; directed: boolean } {
  if (link.direction === 'forward') return { from: link.a, to: link.b, directed: true };
  if (link.direction === 'backward') return { from: link.b, to: link.a, directed: true };
  return { from: link.a, to: link.b, directed: false };
}

/** 어떤 항목 쪽에서 본 방향: out = 이 항목 → 상대, in = 상대 → 이 항목, both = 방향 없음. */
export function directionFor(link: Pick<Link, 'a' | 'b' | 'direction'>, itemId: string): 'out' | 'in' | 'both' {
  const { from, directed } = linkEnds(link);
  if (!directed) return 'both';
  return from === itemId ? 'out' : 'in';
}

type Pt = { x: number; y: number };

/**
 * 같은 두 항목 사이의 선(같은 장면 선 제외)마다 휘는 정도를 정한다.
 * 한 개면 0(직선), 여러 개면 서로 반대쪽으로 휜다. 값은 정렬된 a → b 기준 수직 방향의 거리.
 */
export function pairOffsets(links: Pick<Link, 'id' | 'a' | 'b' | 'kind' | 'direction'>[], gap = 70): Map<string, number> {
  const groups = new Map<string, typeof links>();
  for (const l of links) {
    if (l.kind === 'co_occur') continue;
    const key = `${l.a}|${l.b}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const order = { forward: 0, none: 1, backward: 2 } as const;
  const out = new Map<string, number>();
  for (const list of groups.values()) {
    const sorted = [...list].sort((x, y) => order[x.direction ?? 'none'] - order[y.direction ?? 'none'] || x.kind.localeCompare(y.kind));
    sorted.forEach((l, i) => out.set(l.id, list.length === 1 ? 0 : (i - (list.length - 1) / 2) * gap));
  }
  return out;
}

/**
 * a(정렬상 앞) → b 기준으로 offset만큼 휜 2차 곡선의 제어점. from/to가 반대여도 같은 쪽으로 휘도록 a, b를 기준으로 계산한다.
 */
export function controlPoint(a: Pt, b: Pt, offset: number): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  // 곡선 꼭대기가 offset만큼 떨어지려면 제어점은 그 두 배
  return { x: mx - ((b.y - a.y) / d) * offset * 2, y: my + ((b.x - a.x) / d) * offset * 2 };
}

/** 2차 곡선 위 t 지점. */
export function pointOnCurve(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}
