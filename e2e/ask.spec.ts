import { expect, test, type Page } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

/* 세계관 질문하기: 근거 표시, 근거 없는 답은 경고, 찾지 못함, 저장 요청 없음, 예시 작품은 막힘 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function fake(page: Page, reply: (q: string) => unknown) {
  const calls: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'ask-world') {
      const q = (req.postDataJSON() as { question: string }).question;
      calls.push(q);
      return ok(reply(q));
    }
    return ok({ ok: true });
  });
  return calls;
}

test('질문하면 근거와 함께 답하고, 근거 없는 답·찾지 못함을 구분한다(저장 없음)', async ({ page }) => {
  const { writes } = await prepare(page, { user: true, mine: true });
  const calls = await fake(page, (q) =>
    q.includes('은열쇠')
      ? { ok: true, found: true, answer: '2화에서 처음 나와요.', evidence: [{ text: '리안은 은열쇠를 쥐었다.', tag: 'E2-S1', ep: 2 }], dropped: 1 }
      : q.includes('눈')
        ? { ok: true, found: true, answer: '설정집에는 푸른 눈이라고 적혀 있어요.', evidence: [], dropped: 0 }
        : { ok: true, found: false, answer: '주어진 원고에서는 찾지 못했어요.', evidence: [], dropped: 0 },
  );
  await page.goto(`#/w/${MINE}/bible`);
  await expect(page.getByRole('heading', { name: '세계관 질문하기' })).toBeVisible();
  await expect(page.getByText(/AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  const box = page.getByRole('textbox', { name: '질문' });
  await box.fill('은열쇠를 처음 본 회차는?');
  await page.getByRole('button', { name: '질문하기' }).click();
  await expect(page.getByText('2화에서 처음 나와요.')).toBeVisible();
  await expect(page.getByText('원고 근거 있음')).toBeVisible();
  await expect(page.getByText('리안은 은열쇠를 쥐었다.')).toBeVisible();
  await expect(page.getByText(/확인되지 않은 근거 1개/)).toBeVisible();
  await box.fill('세린의 눈 색은?');
  await page.getByRole('button', { name: '질문하기' }).click();
  await expect(page.getByText('원고 문장으로는 확인 못 함')).toBeVisible();
  await box.fill('달의 나이는?');
  await page.getByRole('button', { name: '질문하기' }).click();
  await expect(page.getByText('찾지 못함', { exact: true })).toBeVisible();
  expect(calls).toHaveLength(3);
  expect(writes.filter((w) => /rest\/v1\/(items|episodes|links|appearances)/.test(w))).toEqual([]);
});

test('예시 작품에서는 질문 칸 대신 안내', async ({ page }) => {
  await prepare(page);
  await fake(page, () => ({ ok: true }));
  await page.goto(`#/w/${SAMPLE}/bible`);
  await expect(page.getByText('세계관 질문은 내 작품에서만 쓸 수 있어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '질문하기' })).toHaveCount(0);
});
