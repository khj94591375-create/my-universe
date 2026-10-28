import type { WorkData } from '../works/workData';

/** 작가가 아직 확인하지 않은 AI 추정 수(메뉴 옆 숫자, BUILD_SPEC 6.5). */
export function unreviewedCount(data: WorkData | null): number {
  if (!data) return 0;
  return (
    data.items.filter((i) => !i.confirmed).length +
    data.items.reduce((n, i) => n + i.aiAliases.length, 0) +
    data.links.filter((l) => l.kind === 'ai').length +
    data.appearances.filter((a) => a.source === 'ai' && a.role === 'resolve').length
  );
}
