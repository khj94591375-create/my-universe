import { useSyncExternalStore } from 'react';

/**
 * 화면 모드(라이트·다크). 사용자가 고르면 이 기기에 기억하고(localStorage 'mu:theme'),
 * 고른 적이 없으면 기기 설정(prefers-color-scheme)을 따른다.
 * 첫 화면이 깜빡이지 않도록 index.html의 작은 스크립트가 먼저 data-theme을 붙여 둔다.
 */
export type Theme = 'light' | 'dark';
const KEY = 'mu:theme';

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}
const systemQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const system = (): Theme => (systemQuery?.matches ? 'dark' : 'light');

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
}

let current: Theme = stored() ?? system();
apply(current);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// 사용자가 직접 고르지 않았으면 기기 설정이 바뀔 때 따라간다
systemQuery?.addEventListener?.('change', () => {
  if (stored()) return;
  current = system();
  apply(current);
  emit();
});

export function setTheme(t: Theme) {
  current = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* 저장이 막혀도 이번 방문에서는 바뀐다 */
  }
  apply(t);
  emit();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
