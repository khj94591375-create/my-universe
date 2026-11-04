import type { Appearance, Episode, ItemKind, ItemView } from '../../data/types';
import { starOpacity } from './layout';

/*
 * 별 하나의 모양·크기·밝기·상태(BUILD_SPEC 6.7). 지도와 홈 미리보기가 함께 쓴다.
 * - 모양: 캐릭터 = 동그라미, 설정 = 마름모, 복선 = 네 갈래 반짝별 (색만으로 구분하지 않게)
 * - 크기: 원고에 나온 횟수
 * - 밝기: 오래 안 나올수록 희미(이름 글자는 항상 선명)
 * - 상태: 작가가 정한 상태(status)만 확정으로 본다. AI의 회수 추정은 "확인 전" 표시만 한다.
 */

/** 이 회차 수 이상 안 나오면 "잊힌 별"로 표시(GapTag 경고와 같은 기준). */
export const FORGOTTEN_GAP = 3;

export function starRadius(mentions: number) {
  return 10 + Math.min(mentions, 8) * 0.8;
}

/** 종류별 모양(가운데가 0,0). */
export function shapePath(kind: ItemKind, r: number): string {
  const f = (n: number) => n.toFixed(1);
  if (kind === 'character') {
    const c = r * 0.82;
    return `M${f(-c)},0a${f(c)},${f(c)} 0 1,0 ${f(2 * c)},0a${f(c)},${f(c)} 0 1,0 ${f(-2 * c)},0Z`;
  }
  if (kind === 'setting') {
    const w = r * 0.9;
    return `M0,${f(-r)}L${f(w)},0L0,${f(r)}L${f(-w)},0Z`;
  }
  // 복선: 네 갈래 반짝별
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.36 : r * 1.12;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    pts.push(`${f(rr * Math.cos(a))},${f(rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}Z`;
}

export type StarState = {
  /** 모양의 밝기(0.35~1). 이름 글자에는 쓰지 않는다. */
  brightness: number;
  /** 오래 안 나온 미회수·재사용 예정 항목 */
  forgotten: boolean;
  /** 작가가 회수 완료·재사용됨으로 정한 복선 */
  done: boolean;
  /** 작가가 재사용 예정으로 정한 항목 */
  planned: boolean;
  /** AI가 회수 장면이라고 추정한 회차(작가 확인 전, 미회수일 때만) */
  aiResolveEp: number | null;
};

export function starState(item: ItemView, maxGap: number, aiResolveEp: number | null = null): StarState {
  const done = item.kind === 'foreshadow' && (item.status === 'resolved' || item.status === 'reused');
  const planned = item.status === 'reuse_planned';
  const waiting = item.status === 'open' || planned;
  return {
    brightness: done ? 1 : starOpacity(item.gap, maxGap),
    forgotten: waiting && item.gap != null && item.gap >= FORGOTTEN_GAP,
    done,
    planned,
    aiResolveEp: item.status === 'open' && item.kind === 'foreshadow' ? aiResolveEp : null,
  };
}

/** AI가 "회수 장면"이라고 추정한 가장 최근 회차(항목별). 작가가 검토 화면에서 확정한다. */
export function aiResolveEps(appearances: Pick<Appearance, 'item_id' | 'episode_id' | 'role' | 'source'>[], episodes: Pick<Episode, 'id' | 'no'>[]): Map<string, number> {
  const no = new Map(episodes.map((e) => [e.id, e.no]));
  const out = new Map<string, number>();
  for (const a of appearances) {
    if (a.role !== 'resolve' || a.source !== 'ai') continue;
    const n = no.get(a.episode_id);
    if (n != null && n > (out.get(a.item_id) ?? 0)) out.set(a.item_id, n);
  }
  return out;
}
