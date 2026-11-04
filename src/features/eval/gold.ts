import { parseCsv } from './csv';

/*
 * 정답 설정집(BUILD_SPEC 12.2): kind,name,aliases,first_ep,last_ep,status,related,resolved_ep
 * 작가가 AI를 돌리기 전에 직접 쓴다. 별칭·관련 항목은 | 로 나눈다.
 */

export type GoldKind = 'character' | 'setting' | 'foreshadow';
export type GoldItem = {
  row: number;
  kind: GoldKind;
  name: string;
  aliases: string[];
  first_ep: number | null;
  last_ep: number | null;
  status: string | null;
  related: string[];
  resolved_ep: number | null;
};

const KINDS: Record<string, GoldKind> = {
  character: 'character', 캐릭터: 'character', 인물: 'character',
  setting: 'setting', 설정: 'setting', 장소: 'setting',
  foreshadow: 'foreshadow', 복선: 'foreshadow',
};
const STATUSES = new Set(['open', 'resolved', 'reuse_planned', 'reused']);
const COLUMNS = ['kind', 'name', 'aliases', 'first_ep', 'last_ep', 'status', 'related', 'resolved_ep'];

const num = (s: string | undefined) => {
  const n = Number((s ?? '').trim());
  return (s ?? '').trim() && Number.isInteger(n) ? n : null;
};
const list = (s: string | undefined) =>
  (s ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

export type GoldParse = { items: GoldItem[]; errors: string[] };

export function parseGold(text: string): GoldParse {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (rows.length === 0) return { items: [], errors: ['빈 파일이에요.'] };
  // 첫 줄이 머리글이면 칸 순서를 머리글에서 읽는다
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const hasHead = head.includes('name') && head.includes('kind');
  const idx = (col: string) => (hasHead ? head.indexOf(col) : COLUMNS.indexOf(col));
  const items: GoldItem[] = [];
  rows.slice(hasHead ? 1 : 0).forEach((r, i) => {
    const line = i + (hasHead ? 2 : 1);
    const get = (col: string) => (idx(col) >= 0 ? r[idx(col)] : undefined);
    const kind = KINDS[(get('kind') ?? '').trim().toLowerCase()];
    const name = (get('name') ?? '').trim();
    if (!name) return errors.push(`${line}번째 줄: 이름(name)이 비어 있어요.`);
    if (!kind) return errors.push(`${line}번째 줄: 종류(kind)는 character / setting / foreshadow 중 하나여야 해요.`);
    const status = (get('status') ?? '').trim() || null;
    if (status && !STATUSES.has(status)) errors.push(`${line}번째 줄: 상태(status) "${status}"는 open / resolved / reuse_planned / reused 중 하나여야 해요.`);
    items.push({
      row: line,
      kind,
      name,
      aliases: list(get('aliases')),
      first_ep: num(get('first_ep')),
      last_ep: num(get('last_ep')),
      status: status && STATUSES.has(status) ? status : null,
      related: list(get('related')),
      resolved_ep: num(get('resolved_ep')),
    });
  });
  return { items, errors };
}
