import { expect, test, type Page } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 연결선 겹침 저장 오류(links_a_b_kind_direction_key)가 나지 않아야 하는 경우들 */
async function setup(page: Page) {
  const ctx = await prepare(page, { user: true, mine: true });
  const mine = ctx.db.T.items.filter((i) => i.work_id === MINE);
  const [x, y] = [mine.find((i) => i.name === '리안')!.id, mine.find((i) => i.name === '세린')!.id].sort();
  // 같은 두 별: 작가가 이은 선(관계 이름 없음) + AI가 찾은 선(관계 이름 있음)
  ctx.db.T.links.push({ id: 'l9000000-0000-4000-8000-000000000001', work_id: MINE, a: x, b: y, kind: 'manual', label: null, weight: 1, evidence: null, direction: 'none' });
  ctx.db.T.links.push({ id: 'l9000000-0000-4000-8000-000000000002', work_id: MINE, a: x, b: y, kind: 'ai', label: '스승과 제자', weight: 1, evidence: '세린은 리안의 스승이었다.', direction: 'none' });
  const pair = () => ctx.db.T.links.filter((l) => l.a === x && l.b === y && l.kind !== 'co_occur');
  return { ...ctx, pair };
}
const errorToast = (page: Page) => page.getByText(/저장하지 못했어요/);

test('작가 선이 이미 있는 두 별의 AI 관계 "맞아요": 선 하나로 합쳐지고 관계 이름이 채워짐', async ({ page }) => {
  const { pair } = await setup(page);
  await page.goto(`#/w/${MINE}/review`);
  const row = page.locator('li', { hasText: '스승과 제자' }).first();
  await row.getByRole('button', { name: '맞아요' }).click();
  await expect(page.getByText(/관계를 확정했어요/)).toBeVisible();
  await expect(errorToast(page)).toHaveCount(0);
  expect(pair().map((l) => [l.kind, l.label, l.evidence])).toEqual([['manual', '스승과 제자', '세린은 리안의 스승이었다.']]);
});

test('"AI 추정 모두 확정"도 겹치는 선이 있어도 성공', async ({ page }) => {
  const { pair } = await setup(page);
  await page.goto(`#/w/${MINE}/review`);
  await page.getByRole('button', { name: /AI 추정 모두 확정/ }).click();
  await expect(page.getByText('AI 추정을 모두 확정했어요.')).toBeVisible();
  await expect(errorToast(page)).toHaveCount(0);
  expect(pair()).toHaveLength(1);
});

test('등장 체크를 빠르게 여러 번 눌러도(같은 장면 연결선 계산이 겹쳐도) 오류가 없다', async ({ page }) => {
  const { db } = await setup(page);
  const ep = 'e9000000-0000-4000-8000-000000000001';
  db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body: '리안과 세린이 은열쇠를 보았다.', source_file: 'x', analyzed_at: '2026-11-01T00:00:00Z', created_at: '2026-10-28T00:00:00Z' });
  // 장면 5개: 리안·세린이 두 장면에 함께(같은 장면 연결선이 생김)
  const mine = db.T.items.filter((i) => i.work_id === MINE);
  const id = (n: string) => mine.find((i) => i.name === n)!.id;
  ['리안과 세린이 만났다.', '리안과 세린이 걸었다.', '은열쇠가 빛났다.', '등불이 켜졌다.', '밤이 왔다.'].forEach((text, k) =>
    db.T.chunks.push({ id: `c900000${k}-0000-4000-8000-000000000001`, episode_id: ep, work_id: MINE, seq: k + 1, text }),
  );
  for (const [n, k] of [['리안', 0], ['세린', 0], ['리안', 1], ['세린', 1]] as const)
    db.T.appearances.push({ id: `a9${k}${n === '리안' ? 1 : 2}00000-0000-4000-8000-000000000001`, item_id: id(n), episode_id: ep, chunk_id: `c900000${k}-0000-4000-8000-000000000001`, evidence: n, source: 'rule', role: 'mention', created_at: '' });
  const failed: number[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/rest/v1/links') && r.status() >= 400) failed.push(r.status());
  });
  // 실제 서버처럼 "새 선 넣기"가 조금 걸리면 다른 계산의 "지우기"가 그 사이에 끼어 겹친다(겹침 재현)
  await page.route('**/rest/v1/links**', async (route) => {
    if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 300));
    await route.fallback();
  });
  await page.goto(`#/w/${MINE}/episodes?open=1`);
  await expect(page.locator('input[type=checkbox]').first()).toBeVisible();
  // 체크 안 된 항목(은열쇠·등불)을 빠르게 연달아 체크 → 같은 장면 연결선 계산이 겹침
  const boxes = page.locator('input[type=checkbox]:not(:checked)');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await boxes.first().click({ noWaitAfter: true });
  await page.waitForTimeout(1500);
  expect(failed).toEqual([]); // 연결선 저장 요청이 겹침으로 실패하지 않음
  await expect(errorToast(page)).toHaveCount(0);
  const mineIds = new Set(db.T.items.filter((i) => i.work_id === MINE).map((i) => i.id));
  const co = db.T.links.filter((l) => l.kind === 'co_occur' && mineIds.has(l.a));
  expect(new Set(co.map((l) => `${l.a}|${l.b}`)).size).toBe(co.length); // 같은 선이 두 번 저장되지 않음
});
