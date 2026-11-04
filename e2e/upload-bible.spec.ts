import { expect, test } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

test('원고 붙여 넣기 → 저장되고 검토 화면으로', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  await page.goto(`#/w/${MINE}/upload`);
  await expect(page.getByText('파일 한 개는 10MB까지 올릴 수 있어요.')).toBeVisible();
  await page.getByRole('tab', { name: '붙여 넣기' }).click();
  const body = db.T.episodes.find((e) => e.work_id === SAMPLE && e.no === 1)!.body as string;
  await page.getByLabel('회차 번호').fill('1');
  await page.getByLabel('본문').fill(body);
  await page.getByRole('button', { name: '저장하고 정리하기' }).click();
  await expect(page).toHaveURL(/\/review/);
  expect(db.T.episodes.filter((e) => e.work_id === MINE)).toHaveLength(1);
  expect(db.T.appearances.some((a) => db.T.items.find((i) => i.id === a.item_id)?.work_id === MINE)).toBe(true);
});

test('설정집: 이름 검색·종류 필터·?item= 이동', async ({ page }) => {
  const { db } = await prepare(page);
  await page.goto(`#/w/${SAMPLE}/bible`);
  await page.getByRole('searchbox', { name: '이름 검색' }).fill('은열쇠');
  await expect(page.locator('li[class*=row]')).toHaveCount(1);
  await page.getByRole('searchbox', { name: '이름 검색' }).fill('');
  await page.getByRole('button', { name: '복선', exact: true }).click();
  await expect(page.getByRole('button', { name: '복선', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const target = db.T.items.find((i) => i.work_id === SAMPLE && i.name === '세린')!;
  await page.goto(`#/w/${SAMPLE}/bible?item=${target.id}`);
  await expect(page.locator(`#item-${target.id}`)).toHaveAttribute('data-target', '');
});
