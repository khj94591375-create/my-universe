import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 내 작품: 책 모양 카드 · 더보기(이름 바꾸기·삭제 확인) · 새 작품 대화상자 → 빈 작업실 · 예시 작품 줄 */

test('책 카드, 더보기 메뉴로 이름 바꾸기, 삭제는 확인 단계', async ({ page }) => {
  await prepare(page, { user: true, mine: true });
  await page.goto('#/works');
  const card = page.locator('article', { hasText: '새 작품' });
  await expect(card.getByRole('link', { name: '이어서 작업' })).toHaveAttribute('href', new RegExp(`/w/${MINE}/home`));
  await card.getByRole('button', { name: '「새 작품」 더보기' }).click();
  await card.getByRole('button', { name: '이름 바꾸기' }).click();
  await card.getByLabel('작품 제목').fill('바뀐 제목');
  await card.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('heading', { name: '바뀐 제목' })).toBeVisible();
  const card2 = page.locator('article', { hasText: '바뀐 제목' });
  await card2.getByRole('button', { name: /더보기/ }).click();
  await card2.getByRole('button', { name: '삭제' }).click();
  await expect(card2.getByText(/회차·항목·이미지가 모두 지워지고 되돌릴 수 없어요/)).toBeVisible();
  await card2.getByRole('button', { name: '취소' }).click();
  // 예시 작품은 따로, 읽기 전용
  await expect(page.getByRole('link', { name: '예시 열어 보기' })).toBeVisible();
});

test('새 작품 대화상자: Esc로 닫기, 만들면 빈 작업실로', async ({ page }) => {
  await prepare(page, { user: true });
  await page.goto('#/works');
  await page.getByRole('button', { name: '+ 새 작품' }).click();
  const dialog = page.getByRole('dialog', { name: '새 작품 만들기' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '+ 새 작품' }).click();
  await dialog.getByLabel('작품 제목').fill('별빛 우체국');
  await dialog.getByRole('button', { name: '만들기' }).click();
  await expect(page).toHaveURL(/\/w\/[^/]+\/home$/);
  await expect(page.getByText('첫 원고를 불러와 이야기를 모아 보세요.')).toBeVisible();
});
