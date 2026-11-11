import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* AI가 찾은 항목에서 "맞아요": 버튼이 사라지고 "AI가 찾음 · 확정", 설정집에서도 AI 배지가 꺼짐 */
for (const theme of ['light', 'dark'] as const)
  test('맞아요를 누르면 확정이 화면에 보인다 ' + theme, async ({ page }) => {
    const { db } = await prepare(page, { user: true, mine: true, theme });
    const ep = 'e6000000-0000-4000-8000-000000000001';
    const it = 'f6000000-0000-4000-8000-000000000001';
    db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body: '노인은 푸른 잉크의 편지를 건넸다.', source_file: 'x', analyzed_at: null, created_at: '2026-10-28T00:00:00Z' });
    db.T.items.push({ id: it, work_id: MINE, kind: 'foreshadow', name: '푸른 잉크의 편지', note: null, look: null, status: 'open', source: 'ai', confirmed: false, reference_image_path: null, created_at: '' });
    db.T.appearances.push({ id: 'a6000000-0000-4000-8000-000000000001', item_id: it, episode_id: ep, chunk_id: null, evidence: '노인은 푸른 잉크의 편지를 건넸다.', source: 'ai', role: 'plant', created_at: '' });
    await page.goto('#/w/' + MINE + '/review?eps=1');
    const row = page.locator('li', { has: page.getByText('푸른 잉크의 편지', { exact: true }) }).first();
    await expect(page.getByRole('button', { name: /AI 추정 모두 확정 \(1\)/ })).toBeVisible();
    await row.getByRole('button', { name: '맞아요' }).click();
    await expect(page.getByText('「푸른 잉크의 편지」을(를) 확정했어요.')).toBeVisible();
    await expect(row.getByRole('button', { name: '맞아요' })).toHaveCount(0);
    await expect(row.getByText('AI가 찾음 · 확정')).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI 추정 모두 확정' })).toBeDisabled();
    expect(db.T.items.find((i) => i.id === it)!.confirmed).toBe(true);
    await page.goto('#/w/' + MINE + '/bible');
    const brow = page.locator('li', { has: page.getByText('푸른 잉크의 편지', { exact: true }) }).first();
    await expect(brow).toBeVisible();
    await expect(brow.getByText('AI 추정', { exact: true })).toHaveCount(0);
  });
