import { expect, test, type Page } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 이미 올린 회차 AI 정리: 범위 고르기, 확인 후 실행, 결과 표시, 사용량 다 쓰면 멈춤, 다시 돌리기, 회차 하나만 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function setup(page: Page, reply: (episodeId: string, n: number) => unknown, used = 0) {
  const ctx = await prepare(page, { user: true, mine: true });
  for (const no of [1, 2, 3]) ctx.db.T.episodes.push({ id: 'e500000' + no + '-0000-4000-8000-000000000001', work_id: MINE, no, title: no + '화', summary: '작가 요약', body: '리안은 문을 열었다.', source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
  const calls: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: used + calls.length, image: 0 } });
    if (name === 'analyze-episode') {
      const id = (req.postDataJSON() as { episodeId: string }).episodeId;
      calls.push(id);
      return ok(reply(id, calls.length));
    }
    return ok({ ok: true });
  });
  return { ...ctx, calls };
}
const counts = (n: number) => ({ ok: true, summary: '', counts: { new_items: n, aliases: 1, relations: 0, resolutions: 0 } });

test('범위를 골라 확인 후 정리, 결과와 검토 링크, 다시 돌릴 수 있음(원고 그대로)', async ({ page }) => {
  const { db, calls } = await setup(page, (_id, n) => (n === 1 ? counts(2) : counts(0)));
  await page.goto('#/w/' + MINE + '/episodes');
  const card = page.locator('#organize');
  await expect(card.getByText(/원고 본문, 이미 있는 항목, 작가가 쓴 요약은 바뀌지 않아요/)).toBeVisible();
  await expect(card.getByText(/회차 3개 · 하루 사용량 3회 \(오늘 남은 50회\)/)).toBeVisible();
  await card.getByLabel('끝 회차').selectOption('2');
  await expect(card.getByText(/회차 2개 · 하루 사용량 2회/)).toBeVisible();
  await card.getByRole('button', { name: 'AI로 정리하기' }).click();
  expect(calls).toHaveLength(0); // 확인 전
  await card.getByRole('button', { name: '정리 시작' }).click();
  await expect(card.getByText('2개 회차 중 2개를 정리했어요. 새로 찾은 것 4개.')).toBeVisible();
  await expect(card.getByText('1화: 새 항목 2 · 별칭 1 · 관계 0 · 회수 제안 0')).toBeVisible();
  await expect(card.getByRole('link', { name: /정리 결과 검토에서 확인하기/ })).toBeVisible();
  expect(calls).toEqual(['e5000001-0000-4000-8000-000000000001', 'e5000002-0000-4000-8000-000000000001']);
  // 다시 돌리기
  await card.getByRole('button', { name: 'AI로 정리하기' }).click();
  await card.getByRole('button', { name: '정리 시작' }).click();
  await expect(card.getByText('2개 회차 중 2개를 정리했어요. 새로 찾은 것 2개.')).toBeVisible();
  expect(calls).toHaveLength(4);
  expect(db.T.episodes.filter((e) => e.work_id === MINE).every((e) => e.body === '리안은 문을 열었다.' && e.summary === '작가 요약')).toBe(true);
  await card.screenshot({ path: '/tmp/claude-0/-home-user-my-universe/6deb0dda-2a94-52b0-a9bb-2e65683a9341/scratchpad/organize.png' });
});

test('오늘 사용량을 다 쓰면 거기서 멈춘다', async ({ page }) => {
  const { calls } = await setup(page, (_id, n) => (n === 2 ? { ok: false, error: 'limit' } : counts(1)));
  await page.goto('#/w/' + MINE + '/episodes');
  const card = page.locator('#organize');
  await card.getByRole('button', { name: 'AI로 정리하기' }).click();
  await card.getByRole('button', { name: '정리 시작' }).click();
  await expect(card.getByText('3개 회차 중 1개를 정리했어요. 새로 찾은 것 2개.')).toBeVisible();
  expect(calls).toHaveLength(2); // 3화는 부르지 않음
});

test('회차를 열면 그 회차만 AI로 정리', async ({ page }) => {
  const { calls } = await setup(page, () => counts(0));
  await page.goto('#/w/' + MINE + '/episodes?open=2');
  await page.getByRole('button', { name: '이 회차 AI로 정리' }).click();
  await page.getByRole('button', { name: '정리 시작' }).click();
  await expect(page.getByText('1개 회차 중 1개를 정리했어요. 새로 찾은 것 1개.')).toBeVisible();
  expect(calls).toEqual(['e5000002-0000-4000-8000-000000000001']);
});
