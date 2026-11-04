import { lazy, type ComponentType } from 'react';

/*
 * 화면별 코드 묶음 나눠 받기. 첫 접속을 가볍게 하려고, 시작·작품 목록·홈·우주 지도 말고는 열 때 받는다.
 * 첫 화면이 뜬 뒤 한가할 때 나머지 화면을 미리 받아 두고, 이미 받은 화면은 기다림 없이 바로 그린다
 * (React.lazy는 이미 받은 화면도 한 번 "불러오는 중"을 거쳐 0.3초쯤 늦어지기 때문).
 * 우주 지도는 핵심 화면이라 처음부터 함께 받는다(App.tsx).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Screen = ComponentType<any>;

const preloaders: (() => Promise<unknown>)[] = [];

function lazyScreen(load: () => Promise<{ default: Screen }>): Screen {
  let Loaded: Screen | null = null;
  let pending: Promise<{ default: Screen }> | null = null;
  const fetchOnce = () =>
    (pending ??= load().then((m) => {
      Loaded = m.default;
      return m;
    }));
  const Lazy = lazy(fetchOnce);
  preloaders.push(() => fetchOnce().catch(() => undefined));
  const Wrapped = (props: object) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />);
  return Wrapped;
}

export const UploadScreen = lazyScreen(() => import('./upload/UploadScreen'));
export const ForgotScreen = lazyScreen(() => import('./forgot/ForgotScreen'));
export const BibleScreen = lazyScreen(() => import('./bible/BibleScreen'));
export const EpisodesScreen = lazyScreen(() => import('./episodes/EpisodesScreen'));
export const ReviewScreen = lazyScreen(() => import('./review/ReviewScreen'));
export const StudioScreen = lazyScreen(() => import('./studio/StudioScreen'));
export const SettingsScreen = lazyScreen(() => import('./settings/SettingsScreen'));
export const EvalScreen = lazyScreen(() => import('./eval/EvalScreen'));
export const PrivacyScreen = lazyScreen(() => import('./privacy/PrivacyScreen'));

let prefetched = false;
/** 첫 화면이 뜬 뒤 한가할 때 한 번만 나머지 화면을 미리 받아 둔다(실패해도 열 때 다시 받는다). */
export function prefetchScreens() {
  if (prefetched) return;
  prefetched = true;
  const run = () => preloaders.forEach((p) => void p());
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 800);
}
