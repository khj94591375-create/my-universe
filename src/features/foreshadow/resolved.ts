import type { ItemKind, ItemStatus } from '../../data/types';

/*
 * 복선 "회수"의 기준 하나: 회수 완료(resolved) 또는 재사용됨(reused).
 * 재사용 예정(reuse_planned)은 아직 회수 전이다. 홈의 지도 칸·회수 현황 카드·별 고리가 모두 이 기준을 쓴다.
 */
export function isResolved(item: { kind: ItemKind; status: ItemStatus }): boolean {
  return item.kind === 'foreshadow' && (item.status === 'resolved' || item.status === 'reused');
}

/** 복선 전체 수와 회수한 수 */
export function resolvedCount(items: { kind: ItemKind; status: ItemStatus }[]): { done: number; total: number } {
  const fs = items.filter((i) => i.kind === 'foreshadow');
  return { done: fs.filter(isResolved).length, total: fs.length };
}
