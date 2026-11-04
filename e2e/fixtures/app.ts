import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { makeDb, MINE, SAMPLE, USER } from './fakedb';

/*
 * 테스트마다 쓰는 준비: 가짜 Supabase(데이터·저장소·AI 함수·로그인), 글꼴 요청 막기,
 * 가이드 본 상태, 화면 모드. 쓰기 요청(GET 아닌 요청)은 writes에 기록한다.
 */
export { MINE, SAMPLE, USER };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const supabaseUrl = /VITE_SUPABASE_URL=(\S+)/.exec(readFileSync('.env.example', 'utf8'))?.[1] ?? '';
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export type Options = { user?: boolean; theme?: 'light' | 'dark'; mine?: boolean };

export async function prepare(page: Page, opts: Options = {}) {
  const db = makeDb(opts.user ? USER : null);
  if (opts.mine) {
    // 내 작품: 예시 작품의 인물·물건 4개를 복사(원고는 없음)
    db.T.works.push({ id: MINE, owner_id: USER, title: '새 작품', genre: '판타지', is_sample: false, art_style: null, created_at: '2026-10-28T00:00:00Z' });
    for (const it of db.T.items.filter((i) => i.work_id === SAMPLE && ['리안', '세린', '반쪽짜리 은열쇠', '책갈피 등불'].includes(i.name))) {
      const id = it.id.replace('8001', '9001');
      db.T.items.push({ ...it, id, work_id: MINE, status: 'open' });
    }
  }
  const writes: string[] = [];
  page.on('request', (r) => {
    if (/\/(rest|functions|storage)\/v1\//.test(r.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && !r.url().endsWith('/ai-status')) writes.push(`${r.method()} ${r.url()}`);
  });
  // 글꼴은 테스트에 필요 없다(외부 주소 막힘 방지)
  await page.route(/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      /* 본문 없음 */
    }
    const r = db.handle(req.method(), req.url(), req.headers(), body);
    const headers: Record<string, string> = { ...CORS, 'content-type': 'application/json' };
    if (r.range) headers['content-range'] = r.range;
    await route.fulfill({ status: r.status, headers, body: r.body == null ? '' : JSON.stringify(r.body) });
  });
  await page.route('**/storage/v1/**', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (u.pathname.includes('/object/sign/') && req.method() === 'GET') return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG });
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: '[]' });
  });
  // AI 함수는 "아직 연결 전"(404)으로
  await page.route('**/functions/v1/**', (route) =>
    route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 404, headers: { ...CORS, 'content-type': 'application/json' }, body: '{"message":"Function not found"}' }),
  );
  const user = { id: USER, email: 'w@e.com', aud: 'authenticated', app_metadata: {}, user_metadata: { guide: { tour: 'done', tips: ['*'] } }, created_at: '' };
  await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(user) }));
  await page.addInitScript(
    ([key, u, theme, loggedIn]) => {
      try {
        localStorage.setItem('mu:guide', JSON.stringify({ tour: 'done', tips: ['*'] }));
        if (theme) localStorage.setItem('mu:theme', theme as string);
        if (loggedIn) {
          const now = Math.floor(Date.now() / 1000);
          localStorage.setItem(key as string, JSON.stringify({ access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: u }));
        }
      } catch {
        /* 저장소 막힘 */
      }
    },
    [storageKey, user, opts.theme ?? null, Boolean(opts.user)] as const,
  );
  return { db, writes };
}

/** axe-core로 접근성 검사(WCAG 2.2 AA). 위반 목록을 돌려준다. */
export async function axe(page: Page): Promise<{ id: string; impact: string | null; nodes: number }[]> {
  const require = createRequire(import.meta.url);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });
}

/** 지도에서 보이는 별 이름·관계 이름 상자끼리 겹친 쌍의 수. */
export function labelOverlaps(page: Page) {
  return page.evaluate(() => {
    const texts = [...document.querySelectorAll('svg[role=group] [data-star] text, svg[role=group] > g > text')].filter((t) => t.textContent && !t.getAttribute('class')?.includes('aiMark'));
    const boxes = texts.map((t) => t.getBoundingClientRect()).filter((r) => r.width > 0);
    let n = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) n++;
      }
    return { shown: boxes.length, overlaps: n };
  });
}
