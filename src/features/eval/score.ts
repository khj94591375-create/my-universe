import type { GoldItem, GoldKind } from './gold';

/*
 * 채점(BUILD_SPEC 12.3). 정답 설정집과 작품의 설정집(또는 AI가 찾은 항목)을 비교한다.
 * 이름 일치: 정답의 이름·별칭 중 하나와 결과의 이름·별칭이 같거나, 한쪽이 다른 쪽을 포함하면 일치.
 */

export type Candidate = {
  id: string;
  kind: GoldKind;
  name: string;
  aliases: string[];
  first_ep: number | null;
  last_ep: number | null;
  status: string;
  related: string[];
};

export type Match = { gold: GoldItem; cand: Candidate; how: 'exact' | 'contains'; kindOk: boolean; epOk: boolean | null; statusOk: boolean | null };
export type Rate = { gold: number; found: number; matched: number; recall: number | null; precision: number | null };
export type EvalResult = {
  total: Rate;
  byKind: Record<GoldKind, Rate>;
  matched: Match[];
  missed: GoldItem[];
  wrong: Candidate[];
  /** 맞게 찾은 항목 중 처음·마지막 등장 회차까지 맞은 비율 */
  epAccuracy: { checked: number; correct: number; rate: number | null };
  /** 정답에 상태가 적힌 복선 중 회수 판단(미회수/회수)이 맞은 비율 */
  resolveAccuracy: { checked: number; correct: number; rate: number | null };
  /** 정답의 관련 항목 쌍 중 연결선으로 찾은 비율 */
  relationRecall: { checked: number; found: number; rate: number | null };
};

/** 비교용: 띄어쓰기·문장부호 무시 */
export const norm = (s: string) => s.replace(/[\s「」『』"'“”‘’·.,!?()[\]-]/g, '').toLowerCase();

const MIN_CONTAIN = 2;

function matchKind(goldNames: string[], candNames: string[]): 'exact' | 'contains' | null {
  const g = goldNames.map(norm).filter(Boolean);
  const c = candNames.map(norm).filter(Boolean);
  if (g.some((x) => c.includes(x))) return 'exact';
  const contains = g.some((x) => c.some((y) => (x.length >= MIN_CONTAIN && y.includes(x)) || (y.length >= MIN_CONTAIN && x.includes(y))));
  return contains ? 'contains' : null;
}

const rate = (a: number, b: number) => (b > 0 ? a / b : null);
const resolvedLike = (s: string | null) => s != null && s !== 'open';

export function scoreEval(gold: GoldItem[], cands: Candidate[]): EvalResult {
  // 1:1로 짝짓는다. 같은 이름(정확히 일치)을 먼저, 그다음 포함 관계
  const used = new Set<string>();
  const matched: Match[] = [];
  const pending = new Set(gold);
  for (const pass of ['exact', 'contains'] as const) {
    for (const g of gold) {
      if (!pending.has(g)) continue;
      const names = [g.name, ...g.aliases];
      const sameKind = (c: Candidate) => c.kind === g.kind;
      const pool = cands.filter((c) => !used.has(c.id) && matchKind(names, [c.name, ...c.aliases]) === pass);
      const c = pool.find(sameKind) ?? pool[0];
      if (!c) continue;
      used.add(c.id);
      pending.delete(g);
      matched.push({
        gold: g,
        cand: c,
        how: pass,
        kindOk: c.kind === g.kind,
        epOk: g.first_ep != null && g.last_ep != null ? c.first_ep === g.first_ep && c.last_ep === g.last_ep : null,
        statusOk: g.kind === 'foreshadow' && g.status ? resolvedLike(g.status) === resolvedLike(c.status) : null,
      });
    }
  }
  const missed = gold.filter((g) => pending.has(g));
  const wrong = cands.filter((c) => !used.has(c.id));

  const rateFor = (kind?: GoldKind): Rate => {
    const g = gold.filter((x) => !kind || x.kind === kind).length;
    const f = cands.filter((x) => !kind || x.kind === kind).length;
    const m = matched.filter((x) => !kind || x.gold.kind === kind).length;
    // 맞은 비율은 결과 쪽 종류로 센다(결과가 그 종류로 낸 것 중 몇 개가 맞았나)
    const mFound = matched.filter((x) => !kind || x.cand.kind === kind).length;
    return { gold: g, found: f, matched: m, recall: rate(m, g), precision: rate(mFound, f) };
  };

  const epChecked = matched.filter((m) => m.epOk != null);
  const stChecked = matched.filter((m) => m.statusOk != null);

  // 관련 항목: 정답 쌍(이름) → 결과 항목 id 쌍이 연결돼 있는지
  const candOfGold = new Map(matched.map((m) => [norm(m.gold.name), m.cand]));
  for (const m of matched) for (const a of m.gold.aliases) candOfGold.set(norm(a), m.cand);
  const pairs = new Set<string>();
  for (const g of gold) for (const r of g.related) pairs.add([norm(g.name), norm(r)].sort().join('|'));
  let relChecked = 0;
  let relFound = 0;
  for (const p of pairs) {
    const [x, y] = p.split('|').map((n) => candOfGold.get(n));
    if (!x || !y) {
      relChecked++;
      continue;
    }
    relChecked++;
    if (x.related.includes(y.id) || y.related.includes(x.id)) relFound++;
  }

  return {
    total: rateFor(),
    byKind: { character: rateFor('character'), setting: rateFor('setting'), foreshadow: rateFor('foreshadow') },
    matched,
    missed,
    wrong,
    epAccuracy: { checked: epChecked.length, correct: epChecked.filter((m) => m.epOk).length, rate: rate(epChecked.filter((m) => m.epOk).length, epChecked.length) },
    resolveAccuracy: { checked: stChecked.length, correct: stChecked.filter((m) => m.statusOk).length, rate: rate(stChecked.filter((m) => m.statusOk).length, stChecked.length) },
    relationRecall: { checked: relChecked, found: relFound, rate: rate(relFound, relChecked) },
  };
}
