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
