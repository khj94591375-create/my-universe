import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 테스트 기간: 이미지 키는 있지만 허용 목록에 없는 사람에게는 삽화가 쉬는 중으로 보이고, 그리기 요청을 보내지 않는다 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

for (const restricted of [true, false])
  test(`삽화 ${restricted ? '쉬는 중(허용 목록 밖)' : '사용 가능(허용 목록 안)'}`, async ({ page }) => {
    await prepare(page, { user: true, mine: true });
    const calls: string[] = [];
    await page.route('**/functions/v1/**', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const name = new URL(req.url()).pathname.split('/').pop()!;
      calls.push(name);
      const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
      if (name === 'ai-status') return ok({ ok: true, enabled: true, imageEnabled: !restricted, imageRestricted: restricted, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
      return ok({ ok: true });
    });
    await page.goto(`#/w/${MINE}/studio`);
    if (restricted) {
      await expect(page.getByText(/삽화 그리기는 지금 쉬고 있어요/).first()).toBeVisible();
      await expect(page.getByText(/이미지 AI 키가 아직 없어요/)).toHaveCount(0);
      await expect(page.getByText('지금 로그인한 계정(w@e.com)은 삽화 허용 목록에 없어요.', { exact: false })).toBeVisible();
    } else {
      await expect(page.getByText(/삽화 그리기는 지금 쉬고 있어요/)).toHaveCount(0);
      await expect(page.getByText(/삽화 허용 목록에 없어요/)).toHaveCount(0);
    }
    expect(calls).not.toContain('generate-image');
  });
