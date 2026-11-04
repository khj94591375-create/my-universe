import { Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import StartScreen from './screens/start/StartScreen';
import WorksScreen from './screens/works/WorksScreen';
import HomeScreen from './screens/home/HomeScreen';
import { NotFoundScreen } from './screens/SimplePages';
import { SessionProvider } from './features/auth/SessionProvider';
import { RequireAuth } from './features/auth/RequireAuth';
import { ToastHost } from './components/Toast';
import { GuideTour } from './components/GuideTour';
import { Loading } from './components/Loading';

// 첫 화면(시작·작품 목록·홈)과 핵심 화면(우주 지도)은 바로, 나머지 화면은 나눠 받는다(screens/loaders.tsx)
import MapScreen from './screens/map/MapScreen';
import { BibleScreen, EpisodesScreen, EvalScreen, ForgotScreen, PrivacyScreen, ReviewScreen, SettingsScreen, StudioScreen, UploadScreen, prefetchScreens } from './screens/loaders';

/**
 * 라우팅: GitHub Pages에서 새로고침해도 404가 나지 않도록 HashRouter를 쓴다(BUILD_SPEC 3.1).
 * 작품 목록·내 설정은 로그인 필요. 작품 화면은 예시 작품이면 누구나, 아니면 소유자만(AppShell + RLS).
 */
export default function App() {
  // 첫 화면이 뜬 뒤 나머지 화면을 미리 받아 둔다
  useEffect(() => prefetchScreens(), []);
  return (
    <SessionProvider>
      <HashRouter>
        <Suspense fallback={<Loading fullPage />}>
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/works" element={<RequireAuth><WorksScreen /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsScreen /></RequireAuth>} />
          <Route path="/eval" element={<RequireAuth><EvalScreen /></RequireAuth>} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route path="/w/:workId" element={<AppShell />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="upload" element={<UploadScreen />} />
            <Route path="review" element={<ReviewScreen />} />
            <Route path="forgot" element={<ForgotScreen />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="bible" element={<BibleScreen />} />
            <Route path="episodes" element={<EpisodesScreen />} />
            <Route path="studio" element={<StudioScreen />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
        </Suspense>
        <GuideTour />
      </HashRouter>
      <ToastHost />
    </SessionProvider>
  );
}
