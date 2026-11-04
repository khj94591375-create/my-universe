import { expect, test } from '@playwright/test';
import { axe, prepare, SAMPLE } from './fixtures/app';

for (const theme of ['light', 'dark'] as const) {
  test(`접근성(axe, WCAG 2.2 AA) · ${theme}`, async ({ page }) => {
    await prepare(page, { theme });
    for (const path of ['#/', `#/w/${SAMPLE}/home`, `#/w/${SAMPLE}/map`, `#/w/${SAMPLE}/bible`, '#/privacy']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      const v = await axe(page);
      expect(v, `${path} ${JSON.stringify(v)}`).toEqual([]);
    }
  });
}

test('320px 화면에서 옆으로 넘치지 않는다', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ['#/', `#/w/${SAMPLE}/home`, `#/w/${SAMPLE}/map`, `#/w/${SAMPLE}/bible`]) {
    await page.goto(path);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(320);
  }
});
