import { useCallback, useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../auth/SessionProvider';
import { readGuide, tipSeen, withTip, withTour, withoutTips, type GuideData } from './guideData';

/*
 * 기억하는 곳: 로그인 사용자는 로그인 정보의 추가 칸(user_metadata.guide) — 다른 기기에서도 같다.
 * 로그인하지 않은 사람(예시 작품)은 이 브라우저에만(localStorage).
 */

const LOCAL_KEY = 'mu:guide';

function readLocal(): GuideData {
  try {
    return readGuide(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'));
  } catch {
    return {};
  }
}
function writeLocal(g: GuideData) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(g));
  } catch {
    /* 저장할 수 없는 브라우저면 이번 방문 동안만 기억 */
  }
}

// 방금 바꾼 값(로그인 정보가 서버에서 돌아오기 전에도 화면이 바로 바뀌게)
let override: { key: string; data: GuideData } | null = null;
let tourOpen = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

/** 처음 가이드 창 열기·닫기(설정의 "다시 보기"도 이걸 부른다) */
export function openTour() {
  tourOpen = true;
  emit();
}
export function closeTour() {
  tourOpen = false;
  emit();
}
export function useTourOpen() {
  return useSyncExternalStore(subscribe, () => tourOpen);
}

export function useGuideState() {
  const { session } = useSession();
  const key = session?.user.id ?? 'local';
  useSyncExternalStore(subscribe, () => override);
  const base = session ? readGuide(session.user.user_metadata?.guide) : readLocal();
  const data = override && override.key === key ? override.data : base;

  const save = useCallback(
    (next: GuideData) => {
      override = { key, data: next };
      emit();
      if (session && supabase) supabase.auth.updateUser({ data: { guide: next } }).catch(() => undefined);
      else writeLocal(next);
    },
    [key, session],
  );

  return {
    data,
    tourSeen: Boolean(data.tour),
    tipSeen: (id: string) => tipSeen(data, id),
    markTour: (how: 'done' | 'skipped') => save(withTour(data, how)),
    dismissTip: (id: string) => save(withTip(data, id)),
    resetTips: () => save(withoutTips(data)),
  };
}
