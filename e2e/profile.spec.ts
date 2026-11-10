import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 인물 소개 카드: 전송 안내 뒤에만 요청, 근거 표시, 옮기기 → 고치기 칸, 저장해야 반영 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

test('인물 소개 AI 초안: 안내 → 만들기 → 옮기기 → 저장', async ({ page }) => {
  const { db, writes } = await prepare(page, { user: true, mine: true });
  const calls: unknown[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'profile-item') {
      calls.push(req.postDataJSON());
      return ok({
        ok: true,
        look: { text: '잿빛 망토를 걸친다.', evidence: [{ text: '리안은 잿빛 망토를 걸쳤다.', tag: 'E1-S1', ep: 1 }] },
        personality: { text: '', evidence: [] },
        speech: { text: '공손한 존댓말을 쓴다.', evidence: [{ text: '"괜찮아요, 사서님."', tag: 'E1-S2', ep: 1 }] },
        dropped: 1,
      });
    }
    return ok({ ok: true });
  });
  await page.goto(`#/w/${MINE}/bible`);
  const row = page.locator('li', { has: page.getByText('리안', { exact: true }) }).first();
  await row.getByRole('button', { name: 'AI 인물 소개' }).click();
  await expect(row.getByText(/AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  expect(calls).toHaveLength(0); // 안내 뒤 눌러야 보냄
  await row.getByRole('button', { name: '인물 소개 만들기' }).click();
  await expect(row.getByText('잿빛 망토를 걸친다.')).toBeVisible();
  await expect(row.getByText('원고에서 확인하지 못했어요.')).toBeVisible(); // 성격
  await expect(row.getByText(/확인되지 않은 근거 1개/)).toBeVisible();
  expect(writes.filter((w) => w.includes('rest/v1/items'))).toEqual([]);
  await row.getByRole('button', { name: '설정집 칸으로 옮기기' }).click();
  await expect(page.getByLabel('외모 · 모습(삽화에 그대로 쓰여요)')).toHaveValue(/^열여섯 살[\s\S]*\n잿빛 망토를 걸친다\.$/); // 기존 외모는 그대로, 끝에 덧붙임
  await expect(page.getByLabel('설명')).toHaveValue(/견습 사서[\s\S]*\n말투: 공손한 존댓말을 쓴다\.$/);
  expect(writes.filter((w) => w.includes('rest/v1/items'))).toEqual([]); // 아직 저장 안 함
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect.poll(() => db.T.items.find((i) => i.work_id === MINE && i.name === '리안')!.look).toMatch(/^열여섯 살.*\n잿빛 망토를 걸친다\.$/s);
});

test('설정·복선 항목에는 인물 소개 버튼이 없다', async ({ page }) => {
  await prepare(page, { user: true, mine: true });
  await page.route('**/functions/v1/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: null }) }));
  await page.goto(`#/w/${MINE}/bible`);
  await expect(page.getByRole('button', { name: 'AI 인물 소개' })).toHaveCount(2); // 리안·세린
});
