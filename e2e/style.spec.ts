import { expect, test } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

/* 문체 분석: 통계는 전송 없이 바로, AI 특징은 안내 뒤 눌러야, 예시 작품은 통계만 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

test('예시 작품: 통계는 바로 보이고 AI 요청은 없다', async ({ page }) => {
  const calls: string[] = [];
  await prepare(page);
  await page.route('**/functions/v1/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    if (route.request().method() !== 'OPTIONS') calls.push(name);
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: null }) });
  });
  await page.goto('#/w/' + SAMPLE + '/episodes');
  await expect(page.getByRole('heading', { name: '문체 분석' })).toBeVisible();
  await expect(page.getByText('서술 문장 평균 길이')).toBeVisible();
  await expect(page.getByText(/^과거형 \d+ · 현재형 \d+$/)).toBeVisible();
  await expect(page.getByText('AI 문체 특징은 내 작품에서만 볼 수 있어요.')).toBeVisible();
  expect(calls.filter((c) => c === 'analyze-style')).toEqual([]);
});

test('내 작품: 안내 뒤 AI 문체 특징(예시 인용), 저장 없음', async ({ page }) => {
  const { db, writes } = await prepare(page, { user: true, mine: true, theme: 'dark' });
  db.T.episodes.push({ id: 'e4000000-0000-4000-8000-000000000001', work_id: MINE, no: 1, title: '1화', summary: null, body: '리안은 멈췄다. 숨을 골랐다.\n"괜찮아요…" 리안이 속삭였다. 리안은 천천히 걸었다. 리안은 천천히 웃었다. 리안은 천천히 돌아섰다.', source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
  const calls: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop()!;
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: null });
    if (name === 'analyze-style') {
      calls.push(name);
      return ok({ ok: true, traits: [{ name: '짧은 문장으로 끊는다', description: '긴장된 장면에서 문장을 짧게 끊어요.', examples: ['리안은 멈췄다.', '숨을 골랐다.'] }], dropped: 1, episodes: 1, sampleChars: 90 });
    }
    return ok({ ok: true });
  });
  await page.goto('#/w/' + MINE + '/episodes');
  await expect(page.getByText(/^리안 \d+ · 천천히 3/)).toBeVisible(); // 자주 쓰는 낱말
  await expect(page.getByText(/약 8,000자가 AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  expect(calls).toEqual([]);
  await page.getByRole('button', { name: 'AI 문체 특징 보기' }).click();
  await expect(page.getByText('짧은 문장으로 끊는다')).toBeVisible();
  await expect(page.getByText('리안은 멈췄다.', { exact: true })).toBeVisible();
  await expect(page.getByText(/확인되지 않은 예시 1개/)).toBeVisible();
  expect(writes.filter((w) => /rest\/v1\/(items|episodes|links|appearances)/.test(w))).toEqual([]);
  await page.locator('#style').screenshot({ path: '/tmp/claude-0/-home-user-my-universe/6deb0dda-2a94-52b0-a9bb-2e65683a9341/scratchpad/style-dark.png' });
});
