import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* AI로 문맥 보고 나누기: 안내 뒤 눌러야 전송, AI는 시작 줄만, 자르기는 화면에서(글자 그대로), 되돌리기, 저장 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const long = (t: string) => (t + ' ').repeat(30).trim();
const FILE = ['나의 학교 이야기', '', long('봄이 왔다. 민준은 새 교실에 들어섰다.'), '', '1. 준비물', '2. 교과서', '', long('그날 이후 민준은 지아와 자주 마주쳤다.'), '', long('여름 방학이 끝나고, 둘은 다시 만났다.')].join('\n');

test('회차 표시 줄이 없는 원고를 AI가 문맥으로 나누고, 표에서 확인 후 저장', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
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
      const lines = text.split('\n');
      const at = (s: string) => lines.findIndex((l) => l.startsWith(s));
      return ok({ ok: true, starts: [{ line: at('봄이 왔다'), title: '새 학기', heading: false, no: null }, { line: at('여름 방학이'), title: '', heading: false, no: null }] });
    }
    if (name === 'analyze-episode') return ok({ ok: true, summary: '', counts: { new_items: 0, aliases: 0, relations: 0, resolutions: 0 } });
    return ok({ ok: true });
  });
  await page.goto('#/w/' + MINE + '/upload');
  await page.locator('input[type=file]').setInputFiles({ name: '학교.txt', mimeType: 'text/plain', buffer: Buffer.from(FILE) });
  await expect(page.getByText(/「학교.txt」 — 회차 표시 줄로 \d+개로 나눴어요/)).toBeVisible();
  await expect(page.getByText(/이 파일의 원고가 AI 회사\(Anthropic\) 서버로 전송돼요/)).toBeVisible();
  expect(sent).toHaveLength(0);
  await page.getByRole('button', { name: 'AI로 문맥 보고 나누기' }).click();
  await expect(page.getByText('「학교.txt」 — AI가 앞뒤 문맥을 보고 2개로 나눴어요. 표에서 경계와 번호를 확인해 주세요.')).toBeVisible();
  await expect(page.getByLabel('학교.txt 제목').first()).toHaveValue('새 학기');
  // 되돌리기 → 다시 AI
  await page.getByRole('button', { name: '회차 표시 줄로 나누기로 되돌리기' }).click();
  await expect(page.getByText(/회차 표시 줄로 \d+개로 나눴어요/)).toBeVisible();
  await page.getByRole('button', { name: 'AI로 문맥 보고 나누기' }).click();
  await expect(page.getByText(/AI가 앞뒤 문맥을 보고 2개로/)).toBeVisible();
  await page.getByRole('button', { name: '저장하고 정리하기' }).click();
  await expect(page).toHaveURL(/\/review/);
  const eps = db.T.episodes.filter((e) => e.work_id === MINE).sort((a, b) => a.no - b.no);
  expect(eps.map((e) => [e.no, e.title])).toEqual([[1, '새 학기'], [2, '2화']]);
  expect(eps[0].body).toContain('1. 준비물'); // 목록 번호에서 자르지 않음
  expect(eps[0].body).toContain('그날 이후 민준은');
  expect(eps[1].body.startsWith('여름 방학이 끝나고')).toBe(true);
});
