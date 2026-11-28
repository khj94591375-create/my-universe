import { expect, test } from '@playwright/test';
import { prepare, SAMPLE } from './fixtures/app';

/* 확인 전 AI 관계는 다음 회차 제안에서도 "AI 추정", 짧은 근거는 앞뒤 원문을 펼쳐 볼 수 있다 */
const OLD = '00000000-0000-4000-8001-000000000002'; // 검은 망토의 노인
const SERIN = '00000000-0000-4000-8001-000000000003'; // 세린 (둘 사이: AI 관계 "스승과 제자")

test('기본 이야기 방향: AI 관계에 "AI 추정·작가 확인 전"', async ({ page }) => {
  await prepare(page);
  await page.goto(`#/w/${SAMPLE}/map?sel=${OLD},${SERIN}`);
  await expect(page.getByText(/「스승과 제자」 관계\(AI 추정·작가 확인 전\)로 이어져 있어요/).first()).toBeVisible();
});

test('짧은 근거 → [앞뒤 원문 보기]로 그 회차 원문의 앞뒤 문장', async ({ page }) => {
  await prepare(page);
  await page.goto(`#/w/${SAMPLE}/map?sel=${OLD},${SERIN}`);
  const toggle = page.getByRole('button', { name: '앞뒤 원문 보기' }).first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  const region = page.getByRole('region', { name: /화 원문에서 근거 앞뒤/ }).first();
  await expect(region).toBeVisible();
  await expect(region.locator('mark')).toHaveCount(1);
  await expect(region.getByRole('link', { name: /화 회차 기록에서 보기/ })).toBeVisible();
  await page.getByRole('button', { name: '앞뒤 원문 접기' }).first().click();
  await expect(region).toHaveCount(0);
});
