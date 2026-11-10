/* 처음 사용 가이드 6장(AI 도우미), 바뀐 화면 도움말은 예전에 닫았어도 다시 보임(바뀌지 않은 화면은 닫은 그대로) */
import { expect, test } from '@playwright/test';
import { SAMPLE, prepare } from './fixtures/app';
for (const theme of ['light', 'dark'] as const) {
  test('tip ' + theme, async ({ page }) => {
    await prepare(page, { theme });
    await page.addInitScript(() => localStorage.setItem('mu:guide', JSON.stringify({ tour: 'done', tips: ['home', 'bible', 'map'] })));
    await page.goto('#/w/' + SAMPLE + '/bible');
    await expect(page.getByLabel('도움말')).toContainText('세계관 질문하기');
    await page.goto('#/w/' + SAMPLE + '/map');
    await page.waitForTimeout(800);
    await expect(page.getByLabel('도움말')).toHaveCount(0);
  });
  test('tour ' + theme, async ({ page }) => {
    await prepare(page, { theme });
    await page.addInitScript(() => localStorage.setItem('mu:guide', JSON.stringify({})));
    await page.goto('#/w/' + SAMPLE + '/home');
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    for (let i = 0; i < 5; i++) await dlg.getByRole('button', { name: '다음' }).click();
    await expect(dlg).toContainText('AI 도우미에게 물어보고 다듬어요');
    await expect(dlg).toContainText('6 / 6');
  });
}
