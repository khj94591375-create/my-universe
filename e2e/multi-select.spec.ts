import { expect, test } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

/* 설정집 여러 개 골라 지우기, 잊힌 복선 여러 개 체크해 다음 이야기 설계로 */
test('설정집: 선택하기 → 보이는 항목 모두 선택 → 하나 빼고 → 선택 삭제(확인 후)', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  await page.goto('#/w/' + MINE + '/bible');
  const mine = () => db.T.items.filter((i) => i.work_id === MINE).map((i) => i.name).sort();
  expect(mine()).toHaveLength(4);
  await page.getByRole('button', { name: '선택하기' }).click();
  // 검색으로 좁히면 보이는 것만 선택
  await page.getByRole('searchbox').fill('리안');
  await page.getByRole('button', { name: /보이는 항목 모두 선택\(1\)/ }).click();
  await expect(page.getByText('1개 선택됨')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /보이는 항목 모두 선택\(4\)/ }).click();
  await expect(page.getByText('4개 선택됨')).toBeVisible();
  await page.getByRole('checkbox', { name: '세린 선택' }).uncheck();
  await expect(page.getByText('3개 선택됨')).toBeVisible();
  await page.getByRole('button', { name: '선택한 3개 지우기' }).click();
  await expect(page.getByText('선택한 3개를 지울까요?', { exact: false })).toBeVisible();
  expect(mine()).toHaveLength(4); // 확인 전에는 그대로
  await page.getByRole('button', { name: '모두 지우기', exact: true }).click();
  await expect(page.getByText('3개를 지웠어요.')).toBeVisible();
  expect(mine()).toEqual(['세린']);
});

test('예시 작품(읽기 전용)에서는 선택하기 버튼이 없다', async ({ page }) => {
  await prepare(page);
  await page.goto('#/w/' + SAMPLE + '/bible');
  await expect(page.getByRole('heading', { name: /캐릭터/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '선택하기' })).toHaveCount(0);
});

test('잊힌 복선: 두 개 이상 체크 → 우주 지도에서 함께 엮어 설계', async ({ page }) => {
  await prepare(page);
  await page.goto('#/w/' + SAMPLE + '/forgot');
  await page.getByRole('checkbox', { name: /^반쪽짜리 은열쇠 체크/ }).check();
  await expect(page.getByRole('button', { name: '체크한 별로 다음 이야기 설계하기' })).toBeDisabled(); // 하나만이면 안내
  await expect(page.getByText(/두 개 이상 체크하면/)).toBeVisible();
  await page.getByRole('checkbox', { name: /^검은 망토의 노인 체크/ }).check();
  await expect(page.getByText('2개 체크: 반쪽짜리 은열쇠, 검은 망토의 노인')).toBeVisible();
  await page.getByRole('button', { name: '체크한 별로 다음 이야기 설계하기' }).click();
  await expect(page).toHaveURL(/\/map\?sel=/);
  await expect(page.getByRole('button', { name: /반쪽짜리 은열쇠 빼기|반쪽짜리 은열쇠/ }).first()).toBeVisible();
  await expect(page.locator('[data-star][aria-pressed=true]')).toHaveCount(2);
});
