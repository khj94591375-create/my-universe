import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 저장 직후: 검토 화면으로 바로 가고 "AI 정리 중"이 보이며, AI가 끝나면 결과가 자동으로 나타난다 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

test('붙여 넣기 저장 → 검토 화면에 AI 정리 중 → 끝나면 결과 자동 갱신', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'split-episodes') return ok({ ok: true, starts: [{ line: 1, no: 1, title: '', scenes: [] }] });
    if (name === 'analyze-episode') {
      await gate;
      // AI가 새 인물을 하나 찾았다고 가정(서버가 쓰는 것처럼 가짜 DB에 넣는다)
      const { episodeId } = req.postDataJSON() as { episodeId: string };
      const id = 'a1000000-0000-4000-8000-0000000000aa';
      db.T.items.push({ id, work_id: MINE, kind: 'character', name: '하람', note: null, look: null, status: 'open', source: 'ai', confirmed: false, reference_image_path: null, created_at: '' });
      db.T.appearances.push({ id: 'b1000000-0000-4000-8000-0000000000aa', item_id: id, episode_id: episodeId, chunk_id: null, evidence: '하람이 문을 두드렸다.', source: 'ai', role: 'appear' });
      return ok({ ok: true, summary: '', counts: { new_items: 1, aliases: 0, relations: 0, resolutions: 0 } });
    }
    return ok({ ok: true });
  });
  await page.goto(`#/w/${MINE}/upload`);
  await page.getByRole('tab', { name: '붙여 넣기' }).click();
  await page.getByLabel('회차 번호').fill('1');
  await page.getByLabel('본문').fill('하람이 문을 두드렸다. 아무도 대답하지 않았다.');
  await page.getByRole('button', { name: '저장하고 정리하기' }).click();
  // 규칙 저장이 끝나면 바로 검토 화면, AI는 아직 정리 중
  await expect(page).toHaveURL(/\/review\?eps=1/);
  await expect(page.getByText(/^AI 정리 중 · 1\/1 · 1화$/)).toBeVisible();
  await expect(page.getByText('AI가 아직 이 회차를 정리하는 중이에요.')).toBeVisible();
  release();
  // 끝나면 결과가 자동으로
  await expect(page.getByText('AI 정리를 마쳤어요 · 새로 찾은 것 1개')).toBeVisible();
  await expect(page.locator('li', { hasText: '하람' }).first()).toBeVisible();
  await expect(page.getByText('AI가 아직 이 회차를 정리하는 중이에요.')).toHaveCount(0);
});
