import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import StartScreen from './screens/start/StartScreen';
import WorksScreen from './screens/works/WorksScreen';
import HomeScreen from './screens/home/HomeScreen';
import UploadScreen from './screens/upload/UploadScreen';
import ForgotScreen from './screens/forgot/ForgotScreen';
import MapScreen from './screens/map/MapScreen';
import BibleScreen from './screens/bible/BibleScreen';
import EpisodesScreen from './screens/episodes/EpisodesScreen';
import { StudioScreen } from './screens/PlaceholderScreens';
import { NotFoundScreen, SettingsScreen } from './screens/SimplePages';
import { SessionProvider } from './features/auth/SessionProvider';
import { RequireAuth } from './features/auth/RequireAuth';
import { ToastHost } from './components/Toast';

/**
 * 라우팅: GitHub Pages에서 새로고침해도 404가 나지 않도록 HashRouter를 쓴다(BUILD_SPEC 3.1).
 * 작품 목록·내 설정은 로그인 필요. 작품 화면은 예시 작품이면 누구나, 아니면 소유자만(AppShell + RLS).
 */
export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/works" element={<RequireAuth><WorksScreen /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsScreen /></RequireAuth>} />
          <Route path="/w/:workId" element={<AppShell />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="upload" element={<UploadScreen />} />
            <Route path="forgot" element={<ForgotScreen />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="bible" element={<BibleScreen />} />
            <Route path="episodes" element={<EpisodesScreen />} />
            <Route path="studio" element={<StudioScreen />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </HashRouter>
      <ToastHost />
    </SessionProvider>
  );
}
