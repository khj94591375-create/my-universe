/*
 * 화면 테스트용 아주 작은 Supabase(PostgREST) 흉내. 이 앱이 쓰는 기능만 있다.
 * 보안 규칙 흉내: 예시 작품은 누구나 읽기, 내 작품만 쓰기.
 * 데이터는 예시 작품 "별의 도서관"(supabase/seed/sample_work.sql에서 만든 JSON).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

const here = dirname(fileURLToPath(import.meta.url));
const load = (t: string): Row[] => JSON.parse(readFileSync(join(here, 'data', `${t}.json`), 'utf8'));

export const SAMPLE = '00000000-0000-4000-8000-000000000001';
export const USER = '11111111-1111-1111-1111-111111111111';
export const MINE = 'aaaaaaaa-0000-4000-8000-000000000009';

const defaults: Record<string, Row> = {
  works: { is_sample: false, art_style: '수채 판타지', genre: null },
  episodes: { title: null, summary: null, analyzed_at: null, source_file: null },
  items: { note: null, look: null, status: 'open', source: 'manual', confirmed: true, reference_image_path: null },
  appearances: { role: 'mention', chunk_id: null },
  links: { label: null, weight: 1, evidence: null, direction: 'none' },
  chunks: { embedding: null },
  item_aliases: { source: 'manual' },
  images: {},
  consistency_issues: { status: 'open' },
};
const uniq: Record<string, string[]> = {
  episodes: ['work_id', 'no'],
  items: ['work_id', 'name'],
  item_aliases: ['item_id', 'alias'],
  links: ['a', 'b', 'kind', 'direction'],
  appearances: ['item_id', 'episode_id', 'chunk_id'],
};

export type Reply = { status: number; body: unknown; range?: string };

export function makeDb(userId: string | null) {
  const T: Tables = {};
  for (const t of ['works', 'episodes', 'chunks', 'items', 'item_aliases', 'appearances', 'links']) T[t] = load(t);
  T.images = [];
  T.ai_usage = [];
  T.consistency_issues = [];
  for (const a of T.item_aliases) a.source = a.source ?? 'manual';

  const work = (wid: string) => T.works.find((x) => x.id === wid);
  const readable = (wid: string) => {
    const w = work(wid);
    return Boolean(w && (w.is_sample || (userId && w.owner_id === userId)));
  };
  const owns = (wid: string) => Boolean(userId && work(wid)?.owner_id === userId);
  const workOf = (t: string, r: Row): string => (t === 'works' ? r.id : r.work_id ?? (r.item_id ? T.items.find((i) => i.id === r.item_id)?.work_id : null));
  const visible = (t: string, r: Row) => readable(workOf(t, r));

  function test(x: unknown, op: string, v: string) {
    if (op === 'eq') return String(x) === v;
    if (op === 'neq') return String(x) !== v;
    if (op === 'is') return v === 'null' ? x == null : String(x) === v;
    if (op === 'in') return v.slice(1, -1).split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(x));
    throw new Error(`지원하지 않는 조건: ${op}`);
  }
  function parseFilters(sp: URLSearchParams) {
    const fs: ((r: Row) => boolean)[] = [];
    for (const [k, v] of sp) {
      if (['select', 'order', 'limit', 'on_conflict', 'columns'].includes(k)) continue;
      if (k === 'or') {
        const parts = v
          .slice(1, -1)
          .split(',')
          .map((p) => {
            const [c, op, ...rest] = p.split('.');
            return { c, op, v: rest.join('.') };
          });
        fs.push((r) => parts.some((p) => test(r[p.c], p.op, p.v)));
        continue;
      }
      if (k.includes('.')) {
        const [, col] = k.split('.');
        const [op, ...rest] = v.split('.');
        fs.push((r) => test(T.items.find((i) => i.id === r.item_id)?.[col], op, rest.join('.')));
        continue;
      }
      let neg = false;
      let vv = v;
      if (vv.startsWith('not.')) {
        neg = true;
        vv = vv.slice(4);
      }
      const [op, ...rest] = vv.split('.');
      fs.push((r) => neg !== test(r[k], op, rest.join('.')));
    }
    return (r: Row) => fs.every((f) => f(r));
  }
  const stats = (w: Row) => ({
    work_id: w.id,
    episode_count: T.episodes.filter((e) => e.work_id === w.id).length,
    open_foreshadow_count: T.items.filter((i) => i.work_id === w.id && i.kind === 'foreshadow' && i.status === 'open').length,
    last_upload_at: T.episodes.filter((e) => e.work_id === w.id).map((e) => e.created_at).sort().pop() ?? null,
  });
  function embed(t: string, rows: Row[], select: string) {
    return rows.map((r) => {
      const o = { ...r };
      if (t === 'items' && select.includes('item_aliases')) o.item_aliases = T.item_aliases.filter((a) => a.item_id === r.id).map((a) => ({ ...a }));
      if (t === 'appearances' && select.includes('items!inner')) o.items = { work_id: T.items.find((i) => i.id === r.item_id)?.work_id };
      return o;
    });
  }
  function cascade(t: string, id: string) {
    const kids: Record<string, [string, string][]> = {
      works: [['episodes', 'work_id'], ['chunks', 'work_id'], ['items', 'work_id'], ['links', 'work_id']],
      episodes: [['chunks', 'episode_id'], ['appearances', 'episode_id']],
      items: [['item_aliases', 'item_id'], ['appearances', 'item_id'], ['links', 'a'], ['links', 'b']],
    };
    for (const [kt, col] of kids[t] ?? [])
      for (const r of T[kt].filter((x) => x[col] === id)) {
        T[kt] = T[kt].filter((x) => x !== r);
        cascade(kt, r.id);
      }
    if (t === 'chunks') T.appearances.forEach((a) => (a.chunk_id === id ? (a.chunk_id = null) : undefined));
  }

  function handle(method: string, url: string, headers: Record<string, string>, body: unknown): Reply {
    const u = new URL(url);
    const t = u.pathname.split('/').pop() as string;
    const sp = u.searchParams;
    const select = sp.get('select') ?? '*';
    const filt = parseFilters(sp);
    const prefer = headers['prefer'] ?? '';
    const single = (headers['accept'] ?? '').includes('vnd.pgrst.object');
    const out = (rows: Row[], status = 200): Reply => {
      if (!single) return { status, body: rows };
      if (rows.length !== 1) return { status: 406, body: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: '', hint: null } };
      return { status, body: rows[0] };
    };
    if (t === 'work_stats') return out(T.works.filter((w) => visible('works', w)).map(stats).filter(filt));
    if (method === 'GET' || method === 'HEAD') {
      let rows = (T[t] ?? []).filter((r) => visible(t, r)).filter(filt);
      const order = sp.get('order');
      if (order) {
        const [c, dir] = order.split('.');
        rows = [...rows].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      if (method === 'HEAD' || prefer.includes('count=exact')) return { status: 200, body: method === 'HEAD' ? null : rows, range: `0-${rows.length - 1}/${rows.length}` };
      return out(embed(t, rows, select));
    }
    if (method === 'POST') {
      const list = (Array.isArray(body) ? body : [body]).map((r: Row) => ({ ...defaults[t], ...(t === 'works' ? { owner_id: userId } : {}), id: t === 'item_aliases' ? undefined : randomUUID(), created_at: new Date().toISOString(), ...r }));
      const res: Row[] = [];
      for (const r of list) {
        if (t === 'item_aliases') {
          delete r.id;
          delete r.created_at;
        }
        if (!owns(workOf(t, r))) return { status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } };
        if (t === 'links' && !(r.a < r.b)) return { status: 400, body: { code: '23514', message: 'check a<b' } };
        const keys = uniq[t];
        const dup = keys && T[t].find((x) => keys.every((k) => x[k] === r[k]) && !(t === 'appearances' && r.chunk_id == null));
        if (dup) {
          if (prefer.includes('ignore-duplicates')) continue;
          if (prefer.includes('merge-duplicates')) {
            Object.assign(dup, r, { id: dup.id });
            res.push(dup);
            continue;
          }
          return { status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint' } };
        }
        T[t].push(r);
        res.push(r);
      }
      return out(prefer.includes('return=representation') ? res : [], 201);
    }
    const mine = (T[t] ?? []).filter((r) => visible(t, r)).filter(filt).filter((r) => owns(workOf(t, r)));
    if (method === 'PATCH') {
      mine.forEach((r) => Object.assign(r, body));
      return out(prefer.includes('return=representation') ? mine : []);
    }
    if (method === 'DELETE') {
      T[t] = T[t].filter((r) => !mine.includes(r));
      mine.forEach((r) => cascade(t, r.id));
      return out(prefer.includes('return=representation') ? mine : []);
    }
    return { status: 405, body: { message: method } };
  }

  return { T, handle };
}
