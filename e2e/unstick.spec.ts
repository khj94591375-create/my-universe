import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 막힌 장면 풀기: 전송 안내, 대안 3개, 근거 있음/없음 구분, 저장 없음 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

test('막힌 장면을 적으면 대안 3개를 근거와 함께 보여 준다(저장 없음)', async ({ page }) => {
  const { db, writes } = await prepare(page, { user: true, mine: true });
  db.T.episodes.push({ id: 'e3000000-0000-4000-8000-000000000001', work_id: MINE, no: 1, title: '1화', summary: null, body: '리안은 문을 열었다.', source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
  const calls: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: null });
    if (name === 'unstick-scene') {
      calls.push((req.postDataJSON() as { situation: string }).situation);
      return ok({
        ok: true,
        options: [
          { title: '세린이 모른 척한다', plan: '세린은 거짓말을 알면서도 리안을 시험한다.', uses: [{ item: '세린', evidence: '세린은 오래 리안을 바라보았다.', ep: 3 }], caution: '' },
          { title: '은열쇠가 진실을 드러낸다', plan: '은열쇠가 거짓말에 반응한다.', uses: [{ item: '반쪽짜리 은열쇠', evidence: null, ep: null }], caution: '2화의 은열쇠 규칙과 맞는지 확인하세요.' },
          { title: '리안이 먼저 고백한다', plan: '리안이 스스로 털어놓는다.', uses: [], caution: '' },
        ],
      });
    }
    return ok({ ok: true });
  });
  await page.goto('#/w/' + MINE + '/home');
  await expect(page.getByRole('heading', { name: '막힌 장면 풀기' })).toBeVisible();
  await expect(page.getByText(/적은 내용과 관련 원고 일부가 AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  await page.getByRole('button', { name: '대안 3개 받기' }).click();
  await expect(page.getByText('막힌 장면을 적어 주세요.')).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByLabel('막힌 장면').fill('세린이 리안의 거짓말을 눈치챘어요.');
  await page.getByRole('button', { name: '대안 3개 받기' }).click();
  await expect(page.getByText('세린이 모른 척한다')).toBeVisible();
  await expect(page.getByText('대안 3', { exact: true })).toBeVisible();
  await expect(page.getByText('세린은 오래 리안을 바라보았다.')).toBeVisible();
  await expect(page.getByText(/반쪽짜리 은열쇠 — 원고 근거 확인 못 함/)).toBeVisible();
  await expect(page.getByText('2화의 은열쇠 규칙과 맞는지 확인하세요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '다른 대안 받기' })).toBeVisible();
  expect(writes.filter((w) => /rest\/v1\/(items|episodes|links|appearances)/.test(w))).toEqual([]);
  await page.locator('#unstick').screenshot({ path: '/tmp/claude-0/-home-user-my-universe/6deb0dda-2a94-52b0-a9bb-2e65683a9341/scratchpad/unstick.png' });
});
