/*
 * 가이드를 봤는지, 어떤 화면 도움말을 닫았는지(순수 함수 — 테스트 가능).
 */

export type GuideData = { tour?: 'done' | 'skipped'; tips?: string[] };

/** 모든 도움말을 끈 표시 */
export const ALL_TIPS = '*';

export function readGuide(raw: unknown): GuideData {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  return {
    tour: r.tour === 'done' || r.tour === 'skipped' ? r.tour : undefined,
    tips: Array.isArray(r.tips) ? r.tips.filter((x): x is string => typeof x === 'string') : [],
  };
}

export const tipSeen = (g: GuideData, id: string) => Boolean(g.tips?.includes(ALL_TIPS) || g.tips?.includes(id));
export const withTour = (g: GuideData, how: 'done' | 'skipped'): GuideData => ({ ...g, tour: how });
export const withTip = (g: GuideData, id: string): GuideData => ({ ...g, tips: [...new Set([...(g.tips ?? []), id])] });
export const withoutTips = (g: GuideData): GuideData => ({ ...g, tips: [] });

/** 도움말 "봤음" 저장 키: 버전 1은 화면 이름 그대로(예전 기록과 호환), 2부터 "화면@버전" */
export const tipKey = (id: string, version = 1) => (version > 1 ? `${id}@${version}` : id);
