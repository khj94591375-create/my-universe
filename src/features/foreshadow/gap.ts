import type { TagTone } from '../../components/Tag';
import { copy } from '../../config/copy';

/*
 * 미등장 회차 수(BUILD_SPEC 7.1).
 */

/** 다음 회차 번호 = 가장 큰 회차 번호 + 1 (회차가 없으면 1). */
export function nextEp(episodeNos: number[]): number {
  return episodeNos.length ? Math.max(...episodeNos) + 1 : 1;
}

/** gap = 가장 최근 회차 − 마지막 등장 회차(최근 회차에 나오면 0). 등장 기록이 없으면 null. */
export function gapOf(latest: number, lastEp: number | null): number | null {
  return lastEp == null ? null : Math.max(0, latest - lastEp);
}

/** GapTag 문구와 색: 0 "최근 회차에 등장", 1~2 중립, 3 이상(3화 연속 안 나옴) 경고. */
export function gapLabel(gap: number): { text: string; tone: TagTone } {
  if (gap <= 0) return { text: copy.labels.gapLatest, tone: 'ok' };
  return { text: copy.labels.gapMissing(gap), tone: gap >= 3 ? 'warn' : 'neutral' };
}
