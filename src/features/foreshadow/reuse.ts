import { josa } from './josa';

/*
 * 재사용 가능성(규칙 1차, BUILD_SPEC 7.7). 최종 결정은 작가가 한다.
 */

export type ReuseLevel = 'high' | 'mid' | 'low';
export type ReuseScore = { level: ReuseLevel; label: string; reason: string };

/**
 * 회수 완료 복선에 대해: 연결된 항목 중 최근 2회차 안에 나온 것이 있으면 높음, 5회차 안이면 보통, 아니면 낮음.
 * latestEp: 작품의 가장 최근 회차 번호. linked: 연결된 항목들의 이름과 마지막 등장 회차.
 */
export function reuseScore(latestEp: number, linked: { name: string; lastEp: number | null }[]): ReuseScore {
  const recent = linked
    .filter((l) => l.lastEp != null)
    .sort((x, y) => (y.lastEp as number) - (x.lastEp as number));
  const top = recent[0];
  if (top && latestEp - (top.lastEp as number) < 2)
    return { level: 'high', label: '높음', reason: `연결된 ${josa(`「${top.name}」`, '이/가')} 최근 회차에 활동 중이에요` };
  if (top && latestEp - (top.lastEp as number) < 5)
    return { level: 'mid', label: '보통', reason: `연결된 ${josa(`「${top.name}」`, '이/가')} ${top.lastEp}화에 나왔어요` };
  return { level: 'low', label: '낮음', reason: '최근 회차에 활동 중인 연결 항목이 없어요' };
}
