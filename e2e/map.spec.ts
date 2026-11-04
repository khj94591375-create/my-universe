import { expect, test } from '@playwright/test';
import { labelOverlaps, MINE, prepare, SAMPLE } from './fixtures/app';

const star = (page: import('@playwright/test').Page, name: string) => page.locator(`[data-star][aria-label^="${name}"]`);

test.describe('우주 지도', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
    await page.goto(`#/w/${SAMPLE}/map`);
    await expect(page.locator('[data-star]')).toHaveCount(9);
  });

  test('이름끼리 겹치지 않고, 확대해도 겹치지 않는다', async ({ page }) => {
    expect((await labelOverlaps(page)).overlaps).toBe(0);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '확대' }).click();
    expect((await labelOverlaps(page)).overlaps).toBe(0);
  });

  test('별 고르기 → ② 관계 확인 → 빈 곳 누르면 처음 상태, 되돌리기', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /별 고르기/ })).toBeVisible();
    await star(page, '반쪽짜리 은열쇠').click();
    await star(page, '검은 망토의 노인').click();
    await expect(page.locator('details[open] summary')).toContainText('검은 망토의 노인');
    await expect(page.getByText('고른 별 사이의 관계')).toBeVisible();
    await expect(page.locator('[data-star][class*=dim]').first()).toBeAttached();
    const box = (await page.locator('svg[role=group]').boundingBox())!;
    await page.mouse.click(box.x + 15, box.y + box.height - 15);
    await expect(page.locator('[data-star][class*=dim]')).toHaveCount(0);
    await expect(page.getByText('고른 별 2개를 비웠어요.')).toBeVisible();
    await page.getByRole('button', { name: '되돌리기' }).click();
    await expect(page.locator('details summary', { hasText: '반쪽짜리 은열쇠' })).toBeVisible();
    await star(page, '세린').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('details summary', { hasText: '반쪽짜리 은열쇠' })).toHaveCount(0);
  });

  test('선을 누르면 관계 정보창', async ({ page }) => {
    await page.locator('[data-link]').first().locator('path, line').last().dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: '두 별의 관계' })).toBeVisible();
  });

  test('예시 작품 설계 체험: 장면 3개, 저장 요청 없음', async ({ page }) => {
    const { writes } = await prepare(page);
    await page.goto(`#/w/${SAMPLE}/map`);
    await expect(page.getByRole('button', { name: '설계 체험하기' })).toBeDisabled();
    await star(page, '리안').click();
    await expect(page.getByRole('button', { name: '설계 체험하기' })).toBeEnabled();
    await page.getByRole('button', { name: '설계 체험하기' }).click();
    await expect(page.locator('ol[class*=scenes] > li')).toHaveCount(3);
    await expect(page.getByText(/AI 결과가 아니에요/)).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('휴대폰: 별을 고르면 "자세히 보기"로 ②에 이동', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await star(page, '리안').click();
    await page.getByRole('button', { name: /자세히 보기/ }).click();
    await expect(page.locator('#step2')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test('내 작품: 별 두 개를 고르면 ②에서 바로 잇기', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  await page.goto(`#/w/${MINE}/map`);
  await star(page, '리안').click();
  await star(page, '세린').click();
  await page.getByRole('button', { name: '「리안」과(와) 「세린」 잇기' }).click();
  await page.getByPlaceholder('관계 이름(예: 편지를 쓴 사람)').fill('스승과 제자');
  await page.getByRole('button', { name: '연결하기' }).click();
  await expect(page.getByText('연결선을 추가했어요.')).toBeVisible();
  expect(db.T.links.filter((l) => l.work_id === MINE && l.kind === 'manual').map((l) => l.label)).toEqual(['스승과 제자']);
});
