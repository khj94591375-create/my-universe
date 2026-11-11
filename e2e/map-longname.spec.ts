import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 긴 이름: 지도에는 줄여서(…), 가리키면·고르면 전체 이름, 이름끼리 겹치지 않음, 휴대폰 가로 넘침 없음 */
const LONG = '왕립 천문대 지하 깊은 곳의 봉인된 보관실';
const LONG2 = '달빛서고의절대깨면안되는세번째규칙';

for (const [theme, w] of [['light', 1280], ['dark', 390]] as const)
  test('긴 이름은 지도에 짧게 ' + theme + ' ' + w, async ({ page }) => {
    const { db } = await prepare(page, { user: true, mine: true, theme });
    await page.setViewportSize({ width: w, height: 860 });
    const base = { work_id: MINE, note: null, look: null, status: 'open', source: 'ai', confirmed: false, reference_image_path: null, created_at: '' };
    db.T.items.push({ ...base, id: 'fa000000-0000-4000-8000-000000000001', kind: 'setting', name: LONG });
    db.T.items.push({ ...base, id: 'fa000000-0000-4000-8000-000000000002', kind: 'foreshadow', name: LONG2 });
    await page.goto('#/w/' + MINE + '/map');
    const star = page.locator('[data-star][aria-label^="' + LONG + '"]');
    await expect(star).toBeAttached(); // 화면 읽기용 이름은 전체
    const texts = await page.locator('[data-star] text').allTextContents();
    expect(texts).not.toContain(LONG);
    expect(texts.every((t) => [...t].length <= 10)).toBe(true);
    expect(texts.some((t) => t === '왕립 천문대 지하…')).toBe(true);
    // 이름끼리 겹치지 않음
    const boxes = (await page.locator('[data-star] text').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom })))).filter((b) => b.x1 > b.x0);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      expect(a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1).toBe(false);
    }
    // 가리키면 전체 이름
    await star.focus();
    const tip = page.locator('svg[role=group] g[class*=tip]');
    await expect(tip).toBeVisible();
    expect((await tip.locator('text').allTextContents()).slice(0, -1).join(' ')).toBe(LONG); // 이름표에는 전체 이름(좁으면 줄바꿈)
    const svgBox = (await page.locator('svg[role=group]').boundingBox())!;
    const tipBox = (await tip.locator('rect').boundingBox())!;
    expect(tipBox.x).toBeGreaterThanOrEqual(svgBox.x - 1); // 지도 밖으로 잘리지 않음
    expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(svgBox.x + svgBox.width + 1);
    // 고르면 오른쪽 창(또는 휴대폰 아래 창)에 전체 이름
    await star.click();
    await expect(page.getByText(LONG, { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  });
