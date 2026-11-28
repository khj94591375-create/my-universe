import { expect, test } from '@playwright/test';
import { prepare, SAMPLE } from './fixtures/app';

test('시작 화면: 제목·버튼·기능 소개 넘기기·개인정보처리방침 링크', async ({ page }) => {
  await prepare(page);
  await page.goto('#/');
  await expect(page.getByRole('heading', { level: 1, name: '잊었던 별을 다시 찾는 곳' })).toBeVisible();
  await expect(page.getByRole('button', { name: '구글로 시작하기' }).first()).toBeVisible();
  // 기능 소개 넘기기: 화살표·점·키보드
  const region = page.getByRole('region', { name: '기능 소개' });
  await expect(region.getByRole('heading', { name: '원고를 올려요' })).toBeVisible();
  await expect(region.getByRole('button', { name: '이전 기능' })).toBeDisabled();
  await region.getByRole('button', { name: '다음 기능' }).click();
  await expect(region.getByRole('heading', { name: '별자리가 생겨요' })).toBeVisible();
  await region.getByRole('button', { name: '5번째 기능 보기' }).click();
  await expect(region.getByRole('heading', { name: '삽화까지 그려요' })).toBeVisible();
  await expect(region.getByRole('button', { name: '다음 기능' })).toBeDisabled();
  await region.getByRole('button', { name: '이전 기능' }).press('ArrowLeft');
  await expect(region.getByRole('heading', { name: '잊힌 복선을 다시 불러요' })).toBeVisible();
  await expect(region.getByText('5개 중 4번째: 잊힌 복선을 다시 불러요')).toBeAttached();
  await page.getByRole('link', { name: '개인정보처리방침' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeVisible();
});

test('시작 화면: 알약 줄 왼쪽을 누르면 로그인 없이 예시 작품으로', async ({ page }) => {
  await prepare(page);
  await page.goto('#/');
  await page.getByRole('button', { name: /예시 작품 「별의 도서관」 먼저 둘러보기/ }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${SAMPLE}/home`));
});

test('예시 작품 홈: 우주 지도 대표 영역과 기존 카드, 지도로 이동', async ({ page }) => {
  await prepare(page);
  await page.goto(`#/w/${SAMPLE}/home`);
  await expect(page.getByRole('heading', { name: '「별의 도서관」의 우주' })).toBeVisible();
  await expect(page.getByRole('img', { name: /우주 지도 미리보기: 별 9개/ })).toBeVisible();
  for (const t of ['오래 잊힌 복선과 설정', '오늘의 한 줄 제안', '복선 회수 현황', '최근 원고']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /내 우주 탐험하기/ }).click();
  await expect(page).toHaveURL(/\/map/);
  await expect(page.locator('[data-star]')).toHaveCount(9);
});

test('화면 모드 전환이 기억된다', async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ colorScheme: 'light' }); // 기기 설정은 밝게, 고른 적 없음
  await page.goto('#/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: '어둡게 보기' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
