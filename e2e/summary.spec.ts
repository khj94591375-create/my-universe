import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* AI 요약 초안: 칸에만 넣고, [저장]을 눌러야 저장. 되돌리기 가능. AI가 꺼져 있으면 버튼 없음. */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function setup(page: import('@playwright/test').Page, aiOn: boolean) {
  const ctx = await prepare(page, { user: true, mine: true });
  ctx.db.T.episodes.push({ id: 'e2000000-0000-4000-8000-000000000001', work_id: MINE, no: 1, title: '1화', summary: '작가가 쓴 요약', body: '리안은 서고 문을 열었다.', source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
  const calls: unknown[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: aiOn, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'summarize-episode') {
      calls.push(req.postDataJSON());
      return ok({ ok: true, summary: '리안이 서고 문을 연다.' });
    }
    return ok({ ok: true });
  });
  return { ...ctx, calls };
}

test('AI 요약 초안은 칸에만, 저장해야 반영, 되돌리기', async ({ page }) => {
  const { db, writes, calls } = await setup(page, true);
  await page.goto(`#/w/${MINE}/episodes?open=1`);
  await page.getByRole('button', { name: '제목·요약 고치기' }).click();
  await expect(page.getByText(/AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  await page.getByRole('button', { name: 'AI로 요약 초안 쓰기' }).click();
  const box = page.getByLabel('요약(2~3문장)');
  await expect(box).toHaveValue('리안이 서고 문을 연다.');
  expect(calls).toHaveLength(1);
  expect(writes.filter((w) => w.includes('rest/v1/episodes'))).toEqual([]); // 아직 저장 안 함
  await page.getByRole('button', { name: '원래 요약으로 되돌리기' }).click();
  await expect(box).toHaveValue('작가가 쓴 요약');
  await page.getByRole('button', { name: 'AI로 요약 초안 쓰기' }).click();
  await expect(box).toHaveValue('리안이 서고 문을 연다.');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect.poll(() => db.T.episodes.find((e) => e.work_id === MINE)!.summary).toBe('리안이 서고 문을 연다.');
});

test('AI가 꺼져 있으면 요약 초안 버튼이 없다', async ({ page }) => {
  await setup(page, false);
  await page.goto(`#/w/${MINE}/episodes?open=1`);
  await page.getByRole('button', { name: '제목·요약 고치기' }).click();
  await expect(page.getByLabel('요약(2~3문장)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI로 요약 초안 쓰기' })).toHaveCount(0);
});
