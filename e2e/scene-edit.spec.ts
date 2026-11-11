import { expect, test } from '@playwright/test';
import { MINE, prepare } from './fixtures/app';

/* 회차 기록에서 장면 합치기·나누기: 본문은 그대로, 장면만 바뀌고, AI 근거는 새 장면에 다시 연결 */
test('장면 합치기·나누기', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  const ep = 'e8000000-0000-4000-8000-000000000001';
  const body = '리안이 서고에 들어섰다.\n먼지가 날렸다.\n\n***\n\n세린이 문 앞에 서 있었다.\n\n\n밤이 깊었다.\n리안은 은열쇠를 쥐었다.';
  db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body, source_file: 'x', analyzed_at: '2026-11-01T00:00:00Z', created_at: '2026-10-28T00:00:00Z' });
  const texts = ['리안이 서고에 들어섰다.\n먼지가 날렸다.', '세린이 문 앞에 서 있었다.', '밤이 깊었다.\n리안은 은열쇠를 쥐었다.'];
  texts.forEach((text, i) => db.T.chunks.push({ id: 'c800000' + i + '-0000-4000-8000-000000000001', episode_id: ep, work_id: MINE, seq: i + 1, text }));
  const keyItem = db.T.items.find((i) => i.work_id === MINE && i.name === '반쪽짜리 은열쇠')!;
  db.T.appearances.push({ id: 'a8000000-0000-4000-8000-000000000001', item_id: keyItem.id, episode_id: ep, chunk_id: 'c8000002-0000-4000-8000-000000000001', evidence: '리안은 은열쇠를 쥐었다.', source: 'ai', role: 'mention', created_at: '' });
  await page.goto('#/w/' + MINE + '/episodes?open=1');
  await expect(page.getByRole('region', { name: '장면 3' })).toBeVisible();
  await page.getByRole('button', { name: '장면 나누기 고치기' }).click();
  // 장면 2를 앞 장면과 합치기
  await page.getByRole('region', { name: '장면 2' }).getByRole('button', { name: '앞 장면과 합치기' }).click();
  await expect(page.getByText('장면을 바꾸고 등장 기록을 다시 정리했어요.')).toBeVisible();
  await expect(page.getByRole('region', { name: '장면 3' })).toHaveCount(0);
  const chunkTexts = () => db.T.chunks.filter((c) => c.episode_id === ep).sort((a, b) => a.seq - b.seq).map((c) => c.text);
  expect(chunkTexts()[0]).toContain('***'); // 사이의 구분선까지 본문 그대로
  // 장면 2(밤이 깊었다)를 둘째 줄에서 나누기
  await page.getByRole('region', { name: '장면 2' }).getByRole('button', { name: '여기서 장면 나누기' }).click();
  await expect(page.getByRole('region', { name: '장면 3' })).toBeVisible();
  expect(chunkTexts().slice(1)).toEqual(['밤이 깊었다.', '리안은 은열쇠를 쥐었다.']);
  expect(db.T.episodes.find((e) => e.id === ep)!.body).toBe(body); // 원고 글자 그대로
  // AI 근거는 새 장면(3)에 다시 연결
  const ai = db.T.appearances.find((a) => a.id === 'a8000000-0000-4000-8000-000000000001')!;
  expect(db.T.chunks.find((c) => c.id === ai.chunk_id)?.text).toBe('리안은 은열쇠를 쥐었다.');
});

test('맞춤법 교정을 원고에 반영해도 작가가 나눈 장면 경계는 그대로', async ({ page }) => {
  const { db } = await prepare(page, { user: true, mine: true });
  const ep = 'e8100000-0000-4000-8000-000000000001';
  const body = '리안은 금새 잠들었다.\n별이 떴다.\n세린은 창밖을 보았다.';
  db.T.episodes.push({ id: ep, work_id: MINE, no: 1, title: '1화', summary: null, body, source_file: 'x', analyzed_at: '2026-11-01T00:00:00Z', created_at: '2026-10-28T00:00:00Z' });
  // 규칙이라면 한 장면이었을 글을 작가가 둘로 나눠 둠
  ['리안은 금새 잠들었다.\n별이 떴다.', '세린은 창밖을 보았다.'].forEach((text, i) => db.T.chunks.push({ id: `c810000${i}-0000-4000-8000-000000000001`, episode_id: ep, work_id: MINE, seq: i + 1, text }));
  await page.goto(`#/w/${MINE}/episodes?open=1&check=1`);
  await page.getByRole('button', { name: '검사 시작' }).click();
  await page.getByRole('tab', { name: '원고에서 보기' }).click();
  await page.locator('button[class*=mark]', { hasText: '금새' }).click();
  await page.getByRole('button', { name: '수정 적용' }).click();
  await page.getByRole('button', { name: '원고에 반영…' }).click();
  await expect(page.getByRole('checkbox', { name: /규칙으로 다시 정리/ })).toBeChecked();
  await page.getByRole('button', { name: '반영하기' }).click();
  await expect(page.getByText('원고에 수정 1건을 반영했어요.')).toBeVisible();
  await expect.poll(() => db.T.chunks.filter((c) => c.episode_id === ep).sort((a, b) => a.seq - b.seq).map((c) => c.text)).toEqual(['리안은 금세 잠들었다.\n별이 떴다.', '세린은 창밖을 보았다.']);
});
