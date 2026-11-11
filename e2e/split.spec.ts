import { expect, test, type Page } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 올리면 AI가 문맥으로 회차·장면을 나눔(전송 안내는 미리), 자르기는 화면에서(글자 그대로), 합치기·나누기, 되돌리기, 실패하면 규칙 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const long = (t: string) => (t + ' ').repeat(30).trim();
const FILE = ['나의 학교 이야기', '', long('봄이 왔다. 민준은 새 교실에 들어섰다.'), '', '1. 준비물', '2. 교과서', '', long('그날 오후 운동장에서 민준은 지아를 만났다.'), '', long('여름 방학이 끝나고, 둘은 다시 만났다.'), '', long('가을 축제 준비가 시작됐다.')].join('\n');

async function setup(page: Page, fail = false) {
  const ctx = await prepare(page, { user: true, mine: true });
  const sent: string[] = [];
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const name = new URL(req.url()).pathname.split('/').pop();
    const ok = (d: unknown) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (name === 'ai-status') return ok({ ok: true, enabled: true, limits: { text: 50, image: 8 }, usage: { text: 0, image: 0 } });
    if (name === 'split-episodes') {
      const text = (req.postDataJSON() as { text: string }).text;
      sent.push(text);
      if (fail) return ok({ ok: false, error: 'ai_failed' });
      const lines = text.split('\n');
      const at = (s: string) => lines.findIndex((l) => l.startsWith(s));
      return ok({ ok: true, starts: [
        { line: at('봄이 왔다'), title: '새 학기', heading: false, no: null, scenes: [at('그날 오후')] },
        { line: at('여름 방학이'), title: '', heading: false, no: null, scenes: [at('가을 축제')] },
      ] });
    }
    if (name === 'analyze-episode') return ok({ ok: true, summary: '', counts: { new_items: 0, aliases: 0, relations: 0, resolutions: 0 } });
    return ok({ ok: true });
  });
  return { ...ctx, sent };
}

test('올리면 AI가 회차·장면을 나누고, 합치기·나누기 후 저장하면 그 장면대로', async ({ page }) => {
  const { db, sent } = await setup(page);
  await page.goto('#/w/' + MINE + '/upload');
  await expect(page.getByText(/파일을 올리면 원고가 AI 회사\(Anthropic\) 서버로 전송되고/)).toBeVisible(); // 올리기 전에 안내
  await page.locator('input[type=file]').setInputFiles({ name: '학교.txt', mimeType: 'text/plain', buffer: Buffer.from(FILE) });
  await expect(page.getByText('「학교.txt」 — AI가 앞뒤 문맥을 보고 2개로 나눴어요. 표에서 경계와 번호를 확인해 주세요.')).toBeVisible();
  expect(sent).toHaveLength(1);
  await expect(page.getByText('장면 2개')).toHaveCount(2);
  // 합치기 → 1개, 장면 4개
  await page.getByRole('button', { name: '2화 앞 회차와 합치기' }).click();
  await expect(page.getByText('장면 4개')).toBeVisible();
  await expect(page.getByLabel('학교.txt 회차')).toHaveCount(1);
  // 다시 나누기: "여름 방학" 줄부터 새 회차
  await page.getByRole('button', { name: '1화 나누기' }).click();
  await page.locator('li', { hasText: '여름 방학이 끝나고' }).getByRole('button', { name: '여기서부터 새 회차' }).click();
  await expect(page.getByLabel('학교.txt 회차')).toHaveCount(2);
  await expect(page.getByText('장면 2개')).toHaveCount(2);
  await page.getByRole('button', { name: '저장하고 정리하기' }).click();
  await expect(page).toHaveURL(/\/review/);
  const eps = db.T.episodes.filter((e) => e.work_id === MINE).sort((a, b) => a.no - b.no);
  expect(eps.map((e) => [e.no, e.title])).toEqual([[1, '새 학기'], [2, '2화']]);
  const scenes = (id: string) => db.T.chunks.filter((c) => c.episode_id === id).sort((a, b) => a.seq - b.seq).map((c) => c.text.slice(0, 8));
  expect(scenes(eps[0].id)).toEqual(['봄이 왔다. 민', '그날 오후 운동']);
  expect(scenes(eps[1].id)).toEqual(['여름 방학이 끝', '가을 축제 준비']);
  expect(eps[0].body).toContain('1. 준비물'); // 목록 번호에서 자르지 않음
});

test('AI가 실패하면 회차 표시 줄로 나누고 알려 준다(다시 시도 가능)', async ({ page }) => {
  const { sent } = await setup(page, true);
  await page.goto('#/w/' + MINE + '/upload');
  await page.locator('input[type=file]').setInputFiles({ name: '학교.txt', mimeType: 'text/plain', buffer: Buffer.from(FILE) });
  await expect(page.getByText(/AI로 나누지 못해 회차 표시 줄로 나눴어요/)).toBeVisible();
  await expect(page.getByText(/「학교.txt」 — 회차 표시 줄로 \d+개로 나눴어요/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI로 문맥 보고 나누기' })).toBeVisible();
  expect(sent).toHaveLength(1);
});
