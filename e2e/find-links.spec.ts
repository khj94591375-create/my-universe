import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 우주 지도 "AI로 관계 찾기": 확인 전에는 요청 없음 → 확인하면 회차마다 관계만 찾기(mode=relations) → 새 선이 저절로 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

test('확인 후 관계만 찾고, 끝나면 지도에 새 선', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  const ep = 'e7000000-0000-4000-8000-000000000001';
  db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body: '세린은 리안의 스승이다.', source_file: 'x', analyzed_at: '2026-10-28T00:00:00Z', created_at: '2026-10-28T00:00:00Z' });
  const mine = db.T.items.filter((i) => i.work_id === MINE);
  const [a, b] = [mine.find((i) => i.name === '리안')!.id, mine.find((i) => i.name === '세린')!.id].sort();
  const calls: unknown[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'analyze-episode') {
      calls.push(req.postDataJSON());
      db.T.links.push({ id: 'l7000000-0000-4000-8000-000000000001', work_id: MINE, a, b, kind: 'ai', label: '스승과 제자', weight: 1, evidence: '세린은 리안의 스승이다.', direction: 'none' });
      return ok({ ok: true, summary: '', counts: { new_items: 0, aliases: 0, relations: 1, resolutions: 0 } });
    }
    return ok({ ok: true });
  });
  await page.goto(`#/w/${MINE}/map`);
  const before = await page.locator('[data-link]').count();
  await page.getByRole('button', { name: /AI로 관계 찾기/ }).click();
  await expect(page.getByText(/올린 회차 1개를 AI가 다시 읽고/)).toBeVisible();
  expect(calls).toHaveLength(0); // 확인 전
  await page.getByRole('button', { name: '관계 찾기 시작' }).click();
  await expect(page.getByText('관계 선 1개를 새로 이었어요', { exact: false })).toBeVisible();
  expect(calls).toEqual([{ workId: MINE, episodeId: ep, mode: 'relations' }]);
  await expect(page.locator('[data-link]')).toHaveCount(before + 1);
});
