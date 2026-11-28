import { expect, test } from '@playwright/test';
import { prepare, SAMPLE } from './fixtures/app';

test('시작 화면: 제목·버튼·기능 소개 넘기기·개인정보처리방침 링크', async ({ page }) => {
  await prepare(page);
  await page.goto('#/');
  await expect(page.getByRole('heading', { level: 1, name: '잊었던 별을 다시 찾는 곳' })).toBeVisible();
  await expect(page.getByRole('button', { name: '구글로 시작하기' }).first()).toBeVisible();
  // 안내 문장은 평소엔 숨고, 버튼에 마우스를 올리면 말풍선으로
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.getByRole('button', { name: '구글로 시작하기' }).first().hover();
  await expect(page.getByRole('tooltip')).toHaveText('구글 계정 하나로 바로 시작해요. 원고는 나만 볼 수 있어요.');
  // 기능 소개 넘기기: 화살표·점·키보드
  const region = page.getByRole('region', { name: '기능 소개' });
  await expect(region.getByRole('heading', { name: '원고를 올려요' })).toBeVisible();
  await region.getByRole('button', { name: '다음 기능' }).click();
  await expect(region.getByRole('heading', { name: '별자리가 생겨요' })).toBeVisible();
  await region.getByRole('button', { name: '5번째 기능 보기' }).click();
  await expect(region.getByRole('heading', { name: '삽화까지 그려요' })).toBeVisible();
  await region.getByRole('button', { name: '이전 기능' }).press('ArrowLeft');
  await expect(region.getByRole('heading', { name: '잊힌 복선을 다시 불러요' })).toBeVisible();
  await expect(region.getByText('5개 중 4번째: 잊힌 복선을 다시 불러요')).toBeAttached();
  // 끝에서 다음 → 처음, 처음에서 이전 → 끝(빙글빙글)
  await region.getByRole('button', { name: '다음 기능' }).click();
  await region.getByRole('button', { name: '다음 기능' }).click();
  await expect(region.getByRole('heading', { name: '원고를 올려요' })).toBeVisible();
  await expect(region.getByRole('button', { name: '1번째 기능 보기' })).toHaveAttribute('aria-current', 'true');
  await page.waitForTimeout(700);
  await region.getByRole('button', { name: '이전 기능' }).click();
  await expect(region.getByRole('heading', { name: '삽화까지 그려요' })).toBeVisible();
  await page.waitForTimeout(700);
  await region.getByRole('button', { name: '다음 기능' }).click();
  await region.getByRole('button', { name: '다음 기능' }).click();
  await expect(region.getByRole('heading', { name: '별자리가 생겨요' })).toBeVisible();
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

test('예시 작품 홈: 최근 회차 등장 표시, 회수 숫자 일치, 설계 체험 버튼 → 서가·은열쇠가 고른 지도', async ({ page }) => {
  await prepare(page);
  await page.goto(`#/w/${SAMPLE}/forgot`);
  // 6화(최신)에 나온 리안은 "최근 회차에 등장"(예전에는 "1화째 미등장")
  const row = page.locator('li', { hasText: '리안' }).first();
  await expect(row.getByText('최근 회차에 등장')).toBeVisible();
  await expect(row.getByText(/화째 미등장/)).toHaveCount(0);
  await page.goto(`#/w/${SAMPLE}/home`);
  // 지도 칸의 "회수한 복선"과 회수 현황 카드가 같은 수(회수 완료 + 재사용됨)
  await expect(page.getByText('회수한 복선 1개')).toBeVisible();
  await expect(page.getByText('/ 4개 회수')).toBeVisible();
  await expect(page.locator('p', { hasText: '/ 4개 회수' })).toContainText('1');
  await page.getByRole('link', { name: '복선 두 개로 7화 설계 체험' }).click();
  await expect(page).toHaveURL(/\/map\?sel=00000000-0000-4000-8001-000000000008,00000000-0000-4000-8001-000000000006/);
  await expect(page.getByRole('button', { name: '설계 체험하기' })).toBeVisible();
});
