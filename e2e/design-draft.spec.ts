import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 설계 결과: 마지막 장면 근거 상자와 본문 초안 상자가 붙지 않고 떨어져 보인다 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

for (const theme of ['light', 'dark'] as const)
  test('본문 초안 상자는 근거 상자와 떨어져 있다 ' + theme, async ({ page }) => {
    const { db } = await prepare(page, { user: true, mine: true, theme });
    const mine = db.T.items.filter((i) => i.work_id === MINE);
    const ids = ['리안', '세린'].map((n) => mine.find((i) => i.name === n)!.id);
    await page.route('**/functions/v1/**', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const name = new URL(req.url()).pathname.split('/').pop();
      const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
      if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
      if (name === 'design-next')
        return ok({ ok: true, sessionId: 's1', targetEp: 2, missing: [], draft: '밤이 깊어도 개구리들은 움직이지 않았다. 달빛 아래 수만 개의 눈이 한곳을 향하고 있었다.', scenes: [
          { no: 1, text: '리안이 서고에 들어선다.', uses: [{ item: '리안', evidence: '리안은 서고에 들어섰다.', tag: 'E1-S1' }] },
          { no: 2, text: '세린이 단서를 건넨다.', uses: [{ item: '세린', evidence: '세린은 쪽지를 내밀었다.', tag: 'E1-S2' }] },
          { no: 3, text: '둘은 강 쪽으로 향한다.', uses: [{ item: '세린', evidence: '쇠붙이로는 설명할 수 없는 일이었다.', tag: 'E1-S3' }] },
        ] });
      return ok({ ok: true });
    });
    await page.goto('#/w/' + MINE + '/map?sel=' + ids.join(','));
    await page.getByRole('switch', { name: '본문 초안까지 받기' }).check();
    await page.getByRole('button', { name: /다음 회차 설계/ }).first().click();
    const draft = page.locator('[class*=draft]').filter({ hasText: '본문 초안(AI 제안)' });
    await expect(draft).toBeVisible();
    const quote = page.locator('blockquote', { hasText: '쇠붙이로는 설명할 수 없는 일이었다.' });
    const q = (await quote.boundingBox())!;
    const d = (await draft.boundingBox())!;
    expect(d.y - (q.y + q.height)).toBeGreaterThanOrEqual(8);
  });
