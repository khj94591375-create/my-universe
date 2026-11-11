import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 원고를 먼저 올리고 설정집에 나중에 넣어도: 넣는 순간 이미 올린 장면에서 찾아 등장 기록이 생긴다 */
test('설정집에 인물을 나중에 넣어도 올린 원고에서 바로 찾는다(별칭 추가도)', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  const ep = 'e7000000-0000-4000-8000-000000000001';
  db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body: 'x', source_file: 'x', analyzed_at: '2026-11-01T00:00:00Z', created_at: '2026-10-28T00:00:00Z' });
  db.T.chunks.push({ id: 'c7000000-0000-4000-8000-000000000001', episode_id: ep, work_id: MINE, seq: 1, text: '도윤은 교문 앞에서 기다렸다. 지야가 손을 흔들었다.' });
  db.T.chunks.push({ id: 'c7000000-0000-4000-8000-000000000002', episode_id: ep, work_id: MINE, seq: 2, text: '도윤이 웃었다.' });
  await page.goto(`#/w/${MINE}/bible`);
  await page.getByRole('button', { name: '항목 추가' }).first().click();
  await page.getByLabel('이름', { exact: true }).fill('도윤');
  await page.locator('form').filter({ has: page.getByLabel('이름', { exact: true }) }).getByRole('button', { name: '항목 추가' }).click();
  await expect(page.getByText('저장했어요. 올린 원고 1개 회차에서 「도윤」을(를) 찾아 등장 기록에 넣었어요.')).toBeVisible();
  const doyun = db.T.items.find((i) => i.work_id === MINE && i.name === '도윤')!;
  expect(db.T.appearances.filter((a) => a.item_id === doyun.id && a.source === 'rule')).toHaveLength(2);
  await expect(page.locator('li', { has: page.getByText('도윤', { exact: true }) }).first().getByText('1화')).toBeVisible();

  // 별칭으로만 나오는 인물: 이름으로는 못 찾고, 별칭을 넣으면 찾는다
  await page.getByRole('button', { name: '항목 추가' }).first().click();
  await page.getByLabel('이름', { exact: true }).fill('김민지');
  await page.locator('form').filter({ has: page.getByLabel('이름', { exact: true }) }).getByRole('button', { name: '항목 추가' }).click();
  await expect(page.getByText('저장했어요. 올린 원고에서는 「김민지」이(가) 나온 곳을 찾지 못했어요.')).toBeVisible();
  const row = page.locator('li', { has: page.getByText('김민지', { exact: true }) }).first();
  await row.getByPlaceholder(/다른 이름/).fill('지야');
  await row.getByRole('button', { name: '별칭 추가' }).click();
  await expect(page.getByText('저장했어요. 올린 원고 1개 회차에서 「지야」을(를) 찾아 등장 기록에 넣었어요.')).toBeVisible();
  const minji = db.T.items.find((i) => i.work_id === MINE && i.name === '김민지')!;
  expect(db.T.appearances.filter((a) => a.item_id === minji.id)).toHaveLength(1);
});
