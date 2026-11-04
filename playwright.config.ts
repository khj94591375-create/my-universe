import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

/*
 * 화면 테스트(e2e) 설정. 진짜 Supabase 대신 e2e/fixtures/fakedb.ts가 응답하므로 키·인터넷이 없어도 돈다.
 * 실행: npm run e2e  (처음 한 번: npx playwright install chromium)
 */
// .env.example의 공개 값(주소·publishable key)을 테스트용 서버에 넣는다
const env = Object.fromEntries(
  readFileSync('.env.example', 'utf8')
    .split('\n')
    .filter((l) => /^VITE_\w+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/my-universe/`,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/my-universe/`,
    reuseExistingServer: !process.env.CI,
    env,
    timeout: 120_000,
  },
});
