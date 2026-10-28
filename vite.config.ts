import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소가 https://<아이디>.github.io/my-universe/ 이므로 base를 저장소 이름으로 둔다.
export default defineConfig({
  plugins: [react()],
  base: '/my-universe/',
  server: { port: 5173 },
});
