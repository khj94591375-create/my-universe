import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 별 두 개를 고르면 지도 위에 "이 두 별 잇기"·"연결 지우기"가 바로 보인다 */
const star = (page: import('@playwright/test').Page, name: string) => page.locator('[data-star][aria-label^="' + name + '"]');

test('별 두 개 → 지도 위에서 바로 잇고, 바로 지우기', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  await page.goto('#/w/' + MINE + '/map');
  await star(page, '리안').click();
  await expect(page.getByRole('button', { name: '이 두 별 잇기' })).toHaveCount(0); // 하나만 고르면 없음
  await star(page, '세린').click();
  const bar = page.getByRole('group', { name: /별을 두 개 고르면/ });
  await expect(bar).toContainText('「리안」 · 「세린」');
  await bar.getByRole('button', { name: '이 두 별 잇기' }).click();
  await page.getByPlaceholder('관계 이름(예: 편지를 쓴 사람)').fill('스승과 제자');
  await page.getByRole('button', { name: '연결하기' }).click();
  await expect(page.getByText('연결선을 추가했어요.')).toBeVisible();
  const mineIds = new Set(db.T.items.filter((i) => i.work_id === MINE).map((i) => i.id));
  const manual = () => db.T.links.filter((l) => l.kind === 'manual' && mineIds.has(l.a) && mineIds.has(l.b));
  expect(manual()).toHaveLength(1);
  await bar.getByRole('button', { name: '연결 지우기(스승과 제자)' }).click();
  await expect(bar.getByText('「리안」–「세린」 연결선을 지울까요?')).toBeVisible();
  await bar.getByRole('button', { name: '지우기', exact: true }).click();
  await expect.poll(() => manual().length).toBe(0);
});
