import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소가 https://<아이디>.github.io/my-universe/ 이므로 base를 저장소 이름으로 둔다.
export default defineConfig({
  plugins: [react()],
  base: '/my-universe/',
  // 지원 브라우저: Chrome·Edge 107+, Firefox 104+, Safari 16+(iOS 16+). README "지원 브라우저" 참고
  build: { target: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
  server: { port: 5173 },
});
