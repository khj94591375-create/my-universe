import { expect, test, type Page } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

/*
 * 맞춤법 검사: 원고를 자동으로 고치지 않는지, 작가가 고른 것만 반영되는지, 사전·대사·고유명사·긴 원고.
 */
const BODY = [
  '리안은 그 문을 열수 있었다. 금새 어두워졌다.',
  '"몰라유, 그 그 사람이 뭔디유." 세린이 말했다.',
  '은열쇠가 반짝였다.',
].join('\n');

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function withEpisode(page: Page, body = BODY) {
  const ctx = await prepare(page, { user: true, mine: true });
  ctx.db.T.episodes.push({ id: 'e1000000-0000-4000-8000-000000000001', work_id: MINE, no: 1, title: '1화', summary: '요약은 그대로', body, source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
  return ctx;
}

/** AI 켜짐 + spell-check 가짜 응답(텍스트마다 calls에 기록) */
async function fakeAi(page: Page, reply: (text: string, n: number) => unknown) {
  const calls: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'spell-check') {
      const text = (req.postDataJSON() as { text: string }).text;
      calls.push(text);
      return ok(reply(text, calls.length));
    }
    return ok({ ok: true });
  });
  return calls;
}

const episodeWrites = (writes: string[]) => writes.filter((w) => /rest\/v1\/(episodes|chunks|appearances|items|links)/.test(w));

test('기본 규칙만(AI 꺼짐): 고른 것만 교정본에, 확인 전에는 원고 그대로, 반영하면 본문만 바뀜', async ({ page }) => {
  const { db, writes } = await withEpisode(page);
  await page.goto(`#/w/${MINE}/episodes?open=1&check=1`);
  await expect(page.getByText(/기본 규칙\(외부 전송 없음\)으로만 검사해요/)).toBeVisible();
  await page.getByRole('button', { name: '검사 시작' }).click();
  await expect(page.getByText(/^제안 \d+건$/)).toBeVisible();
  // 대사 안 "그 그"는 확인 필요, "몰라유"(사투리)는 제안 없음
  await page.getByRole('tab', { name: '원고에서 보기' }).click();
  await expect(page.locator('button[class*=mark]', { hasText: '몰라유' })).toHaveCount(0);
  await page.locator('button[class*=mark]', { hasText: '금새' }).click();
  await expect(page.getByText('확인 필요', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '수정 적용' }).click();
  // 나머지는 원문 유지
  for (let i = 0; i < 6; i++) {
    const keep = page.getByRole('button', { name: '원문 유지' });
    if (!(await keep.isVisible())) break;
    await keep.click();
  }
  await page.getByRole('tab', { name: '수정 전후 비교' }).click();
  await expect(page.locator('ins')).toHaveText(['금세']);
  expect(episodeWrites(writes)).toEqual([]); // 아직 원고는 그대로
  expect(db.T.episodes.find((e) => e.work_id === MINE)!.body).toBe(BODY);
  // 반영(확인 후)
  await page.getByRole('button', { name: '원고에 반영…' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('기존 정리 결과');
  await page.getByRole('button', { name: '반영하기' }).click();
  await expect(page.getByText('원고에 수정 1건을 반영했어요.')).toBeVisible();
  const ep = db.T.episodes.find((e) => e.work_id === MINE)!;
  expect(ep.body).toBe(BODY.replace('금새', '금세'));
  expect(ep.summary).toBe('요약은 그대로'); // 본문만 바뀜
  expect(db.T.items.filter((i) => i.work_id === MINE)).toHaveLength(4); // 설정집 그대로
});

test('AI 검사: 고유명사는 빼고, 대사는 "확인 필요", 앞으로도 유지하면 사전에 등록되어 다음 검사에서 빠짐', async ({ page }) => {
  const { db } = await withEpisode(page);
  await fakeAi(page, () => ({
    ok: true,
    suggestions: [
      { original: '은열쇠가', suggestion: '은 열쇠가', type: 'spacing', reason: '띄어쓰기', certainty: 'sure', in_dialogue: false },
      { original: '뭔디유', suggestion: '뭔데요', type: 'spelling', reason: '표준어', certainty: 'sure', in_dialogue: true },
      { original: '열수 있었다', suggestion: '열 수 있었다', type: 'spacing', reason: '의존 명사', certainty: 'sure', in_dialogue: false },
    ],
  }));
  await page.goto(`#/w/${MINE}/episodes?open=1&check=1`);
  await expect(page.getByText(/AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  await page.getByRole('button', { name: '검사 시작' }).click();
  await page.getByRole('tab', { name: '원고에서 보기' }).click();
  await expect(page.locator('button[class*=mark]', { hasText: '은열쇠가' })).toHaveCount(0); // 설정집 이름 보호
  await page.locator('button[class*=mark]', { hasText: '뭔디유' }).click();
  await expect(page.getByText('확인 필요', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '앞으로도 이 표현 유지' }).click();
  await expect(page.getByText(/「뭔디유」을\(를\) 작품 사전에 넣었어요/)).toBeVisible();
  expect(db.T.style_terms.map((t) => t.term)).toEqual(['뭔디유']);
  // 다시 검사하면 사전 표현은 제안하지 않음
  await page.getByRole('button', { name: '다시 검사' }).click();
  await page.getByRole('tab', { name: '원고에서 보기' }).click();
  await expect(page.locator('button[class*=mark]', { hasText: '열수' })).toHaveCount(1);
  await expect(page.locator('button[class*=mark]', { hasText: '뭔디유' })).toHaveCount(0);
});

test('긴 원고: 묶음으로 나눠 검사, 실패한 묶음만 다시 검사', async ({ page }) => {
  const long = Array.from({ length: 300 }, (_, i) => `${i}번째 문장에서 리안이 금새 서고를 지나갔다.`).join('\n');
  await withEpisode(page, long);
  const calls = await fakeAi(page, (_text, n) => (n === 2 ? { ok: false, error: 'ai_failed' } : { ok: true, suggestions: [] }));
  await page.goto(`#/w/${MINE}/episodes?open=1&check=1`);
  await page.getByRole('button', { name: '검사 시작' }).click();
  await expect(page.getByText(/묶음은 검사하지 못했어요/)).toBeVisible();
  const first = calls.length;
  expect(first).toBeGreaterThan(2);
  expect(calls.every((t) => t.length <= 3000)).toBe(true);
  await page.getByRole('button', { name: '못 한 부분 다시 검사' }).click();
  await expect(page.getByText(/묶음은 검사하지 못했어요/)).toHaveCount(0);
  expect(calls.length).toBe(first + 1); // 실패한 1묶음만
  await expect(page.getByText(/^제안 \d+건$/)).toBeVisible(); // 규칙 제안(금새)은 그대로
});

test('예시 작품: 기본 규칙 체험만, 반영 버튼 없음, 저장 요청 없음 / 휴대폰 화면', async ({ page }) => {
  const { writes } = await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`#/w/${SAMPLE}/episodes?open=1&check=1`);
  await expect(page.getByText(/예시 작품은 읽기 전용이라 기본 규칙 검사만/)).toBeVisible();
  await page.getByRole('button', { name: '검사 시작' }).click();
  await expect(page.getByText(/^제안 \d+건$|고칠 곳을 찾지 못했어요/)).toBeVisible();
  await expect(page.getByRole('button', { name: '원고에 반영…' })).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('검토 화면에서 "맞춤법 검사하기"로 이동(선택 기능)', async ({ page }) => {
  await withEpisode(page);
  await page.goto(`#/w/${MINE}/review?eps=1`);
  await page.getByRole('link', { name: /맞춤법 검사하기/ }).click();
  await expect(page.getByRole('heading', { name: '맞춤법 검사' })).toBeVisible();
});
