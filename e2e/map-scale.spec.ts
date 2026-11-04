import { expect, test, type Page } from '@playwright/test';
import { BIG, labelOverlaps, prepare, SAMPLE } from './fixtures/app';

const star = (page: Page, name: string) => page.locator(`[data-star][aria-label^="${name}"]`);

test.describe('별이 많을 때(30·50·100개)', () => {
  for (const n of [30, 50, 100]) {
    test(`${n}개: 겹침 없이 표시, 확대하면 이름이 더 보임`, async ({ page }) => {
      await prepare(page, { big: n });
      const t0 = Date.now();
      await page.goto(`#/w/${BIG}/map`);
      await expect(page.locator('[data-star]')).toHaveCount(n);
      const ms = Date.now() - t0;
      const fit = await labelOverlaps(page);
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '확대' }).click();
      const zoomed = await labelOverlaps(page);
      console.log(`[${n}] 첫 표시 ${ms}ms, 이름 ${fit.shown}개 → 확대 ${zoomed.shown}개`);
      expect(fit.overlaps).toBe(0);
      expect(zoomed.overlaps).toBe(0);
      expect(zoomed.shown).toBeGreaterThanOrEqual(fit.shown);
      expect(page.url()).toContain(`/w/${BIG}/map`); // 다른 페이지로 보내지 않음
    });
  }
});

test.describe('지도 크게 보기', () => {
  test('켜기 → 좌표 그대로, 패널 숨김, 별 선택·검색·필터·확대 → Esc로 복귀', async ({ page }) => {
    await prepare(page);
    await page.goto(`#/w/${SAMPLE}/map`);
    await star(page, '리안').click();
    const before = await star(page, '세린').getAttribute('transform');
    const small = (await page.locator('svg[role=group]').boundingBox())!;
    await page.getByRole('button', { name: '지도 크게 보기' }).click();
    await expect(page.getByRole('region', { name: '우주 지도 크게 보기' })).toBeVisible();
    await expect(page.locator('#step1')).toBeHidden();
    const big = (await page.locator('svg[role=group]').boundingBox())!;
    expect(big.width * big.height).toBeGreaterThan(small.width * small.height * 1.3);
    expect(await star(page, '세린').getAttribute('transform')).toBe(before); // 좌표 불변
    // 간단 정보
    await star(page, '세린').click();
    await expect(page.locator('div[class*=quick][role=status]')).toContainText('세린');
    // 검색·필터·확대
    await page.getByPlaceholder('이름 또는 별칭').fill('은열쇠');
    await page.getByRole('button', { name: '별 이름 찾기' }).click();
    await expect(page.locator('div[class*=quick][role=status]')).toContainText('반쪽짜리 은열쇠');
    await page.getByRole('checkbox', { name: /설정/ }).uncheck();
    await expect(page.locator('[data-star]')).toHaveCount(7);
    await page.getByRole('checkbox', { name: /설정/ }).check();
    await page.getByRole('button', { name: '확대' }).click();
    // Esc: 크게 보기만 끄고 고른 별은 유지
    await page.keyboard.press('Escape');
    await expect(page.getByRole('region', { name: '우주 지도 크게 보기' })).toHaveCount(0);
    await expect(page.locator('#step1')).toBeVisible();
    await expect(page.locator('details summary', { hasText: '리안' })).toBeVisible();
    await expect(page.getByRole('button', { name: '지도 크게 보기' })).toBeFocused();
  });

  test('"기본 화면으로 돌아가기" 버튼, 간단 정보에서 자세히 보기', async ({ page }) => {
    await prepare(page);
    await page.goto(`#/w/${SAMPLE}/map`);
    await page.getByRole('button', { name: '지도 크게 보기' }).click();
    await page.getByRole('button', { name: '기본 화면으로 돌아가기' }).click();
    await expect(page.locator('#step1')).toBeVisible();
    await page.getByRole('button', { name: '지도 크게 보기' }).click();
    await star(page, '세린').click();
    await page.getByRole('button', { name: '기본 화면에서 자세히 보기' }).click();
    await expect(page.locator('#step2')).toBeFocused();
  });

  test('키보드만으로: Tab으로 별 → Enter로 선택, 휴대폰에서도 크게 보기', async ({ page }) => {
    await prepare(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`#/w/${SAMPLE}/map`);
    await page.getByRole('button', { name: '지도 크게 보기' }).click();
    const box = (await page.locator('svg[role=group]').boundingBox())!;
    expect(box.width).toBeGreaterThan(340);
    expect(box.height).toBeGreaterThan(500);
    await star(page, '리안').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('div[class*=quick][role=status]')).toContainText('리안');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('region', { name: '우주 지도 크게 보기' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test('안내문: 짧은 한 문장, 예시 작품 안내는 한 번만', async ({ page }) => {
  await prepare(page);
  await page.goto(`#/w/${SAMPLE}/map`);
  await expect(page.getByText('지도에서 별을 선택해 정보를 확인하세요. 두 개 이상 선택하면 관계를 살펴보고 다음 이야기를 설계할 수 있습니다.')).toBeVisible();
  await expect(page.getByText('별을 선택하면 정보와 관계가 여기에 나와요.')).toBeVisible();
  const panel = page.locator('section[aria-labelledby=step3]');
  await expect(panel.getByText('예시 작품은 읽기 전용이에요', { exact: false })).toHaveCount(1);
  await expect(panel.getByText('로그인하면', { exact: false })).toHaveCount(0);
  await page.getByText('사용법·기호').click();
  await expect(page.getByText(/지도 크게 보기"를 누르면/)).toBeVisible();
});
