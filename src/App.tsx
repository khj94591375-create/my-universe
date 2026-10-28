import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import StartScreen from './screens/start/StartScreen';
import WorksScreen from './screens/works/WorksScreen';
import HomeScreen from './screens/home/HomeScreen';
import { BibleScreen, EpisodesScreen, ForgotScreen, MapScreen, StudioScreen, UploadScreen } from './screens/PlaceholderScreens';
import { NotFoundScreen, SettingsScreen } from './screens/SimplePages';

/** 라우팅: GitHub Pages에서 새로고침해도 404가 나지 않도록 HashRouter를 쓴다(BUILD_SPEC 3.1). */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/works" element={<WorksScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
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
  );
}
