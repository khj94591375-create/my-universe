import type { TagTone } from '../../components/Tag';

/*
 * 미등장 회차 수(BUILD_SPEC 7.1).
 */

/** 다음 회차 번호 = 가장 큰 회차 번호 + 1 (회차가 없으면 1). */
export function nextEp(episodeNos: number[]): number {
  return episodeNos.length ? Math.max(...episodeNos) + 1 : 1;
}

/** gap = 다음 회차 − 마지막 등장 회차. 등장 기록이 없으면 null. */
export function gapOf(next: number, lastEp: number | null): number | null {
  return lastEp == null ? null : next - lastEp;
}

/** GapTag 문구와 색: 0 이하 "이번 화 등장", 1~2 중립, 3 이상 경고. */
export function gapLabel(gap: number): { text: string; tone: TagTone } {
  if (gap <= 0) return { text: '이번 화 등장', tone: 'ok' };
  return { text: `${gap}화째 미등장`, tone: gap >= 3 ? 'warn' : 'neutral' };
}
