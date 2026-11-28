import { expect, test } from '@playwright/test';
import { MINE, prepare, SAMPLE } from './fixtures/app';

/* 로그인 뒤 탐색: 상단 다섯 메뉴 · 작품 선택 · 계정 메뉴 · 원고 하위 탭 · 휴대폰 하단 탐색 · 예전 주소 */

test('상단 다섯 메뉴와 선택 표시, 원고 하위 탭, 예전 주소도 대응 메뉴로', async ({ page }) => {
  await prepare(page, { user: true, mine: true });
  await page.goto(`#/w/${SAMPLE}/home`);
  const nav = page.getByRole('navigation', { name: '작품 메뉴', exact: true });
  for (const t of ['작업실', '우주 지도', '원고', '설정집', '삽화']) await expect(nav.getByRole('link', { name: new RegExp(`^${t}`) })).toBeVisible();
  await expect(nav.getByRole('link', { name: '작업실' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: /^원고/ }).click();
  await expect(page).toHaveURL(/\/episodes$/);
  const tabs = page.getByRole('navigation', { name: '원고 하위 메뉴' });
  await expect(tabs.getByRole('link', { name: '회차 기록' })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: /정리 결과 검토/ }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(nav.getByRole('link', { name: /^원고/ })).toHaveAttribute('aria-current', 'page');
  // 예전 주소: 잊힌 복선 찾기 → 작업실 선택, 원고 불러오기 → 원고 선택
  await page.goto(`#/w/${SAMPLE}/forgot`);
  await expect(nav.getByRole('link', { name: '작업실' })).toHaveAttribute('aria-current', 'page');
  await page.goto(`#/w/${SAMPLE}/upload`);
  await expect(nav.getByRole('link', { name: /^원고/ })).toHaveAttribute('aria-current', 'page');
});

test('작품 선택기로 다른 작품의 같은 메뉴로, 계정 메뉴(설정·도움말·로그아웃), Esc로 닫고 초점 복귀', async ({ page }) => {
  await prepare(page, { user: true, mine: true });
  await page.goto(`#/w/${SAMPLE}/bible`);
  await page.getByRole('button', { name: /작품 바꾸기 · 지금: 별의 도서관/ }).click();
  await page.getByRole('button', { name: '새 작품' }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${MINE}/bible`));
  const acc = page.getByRole('button', { name: /계정 메뉴/ });
  await acc.click();
  await expect(page.getByRole('link', { name: '내 설정' })).toBeVisible();
  await expect(page.getByRole('link', { name: '도움말 · 문의' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: '내 설정' })).toHaveCount(0);
  await expect(acc).toBeFocused();
});

test('휴대폰(390px): 다섯 메뉴는 아래 탐색, 위 메뉴는 숨김', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { user: true });
  await page.goto(`#/w/${SAMPLE}/map`);
  const bottom = page.getByRole('navigation', { name: '작품 메뉴(하단)' });
  await expect(bottom).toBeVisible();
  await expect(page.getByRole('navigation', { name: '작품 메뉴', exact: true })).toBeHidden();
  await expect(bottom.getByRole('link', { name: '지도' })).toHaveAttribute('aria-current', 'page');
  await bottom.getByRole('link', { name: '설정집' }).click();
  await expect(page).toHaveURL(/\/bible$/);
});
