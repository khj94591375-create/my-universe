import { describe, expect, it } from 'vitest';
import { parseCsv } from '../eval/csv';
import { parseGold } from '../eval/gold';
import { scoreEval, type Candidate } from '../eval/score';

const GOLD = `kind,name,aliases,first_ep,last_ep,status,related,resolved_ep
character,리안,견습생|사서님,1,6,,검은 망토의 노인,
foreshadow,반쪽짜리 은열쇠,은열쇠,1,3,open,금서 구역,
foreshadow,달빛 서고의 규칙,,1,4,resolved,리안,4
setting,금서 구역,,3,6,,,
character,검은 망토의 노인,노인,1,5,,,`;

describe('12.2 정답 설정집 읽기', () => {
  it('따옴표 안 쉼표·줄바꿈과 BOM을 처리한다', () => {
    expect(parseCsv('﻿a,"b,c"\r\n"d ""e""",\n')).toEqual([['a', 'b,c'], ['d "e"', '']]);
  });
  it('머리글·별칭·관련 항목·숫자를 읽고, 잘못된 줄은 알려 준다', () => {
    const g = parseGold(GOLD);
    expect(g.errors).toEqual([]);
    expect(g.items).toHaveLength(5);
    expect(g.items[0]).toMatchObject({ kind: 'character', name: '리안', aliases: ['견습생', '사서님'], first_ep: 1, last_ep: 6, status: null, related: ['검은 망토의 노인'] });
    expect(g.items[2]).toMatchObject({ status: 'resolved', resolved_ep: 4 });
    const bad = parseGold('kind,name\nmonster,괴물\ncharacter,');
    expect(bad.errors).toHaveLength(2);
    expect(parseGold('복선,은열쇠').items[0]).toMatchObject({ kind: 'foreshadow', name: '은열쇠' });
  });
});

describe('12.3 채점', () => {
  const c = (id: string, kind: Candidate['kind'], name: string, extra: Partial<Candidate> = {}): Candidate => ({
    id, kind, name, aliases: [], first_ep: null, last_ep: null, status: 'open', related: [], ...extra,
  });
  const gold = parseGold(GOLD).items;
  const cands = [
    c('r', 'character', '리안', { first_ep: 1, last_ep: 6, related: ['n'] }),
    c('k', 'foreshadow', '은열쇠', { first_ep: 1, last_ep: 2 }), // 별칭으로 일치, 마지막 회차 틀림
    c('n', 'character', '망토의 노인', { first_ep: 1, last_ep: 5, related: ['r'] }), // 포함 관계로 일치
    c('x', 'setting', '고양이'), // 엉뚱하게 찾음
    c('rule', 'foreshadow', '달빛 서고 규칙', { status: 'open' }), // 정답 '달빛 서고의 규칙'(띄어쓰기·조사 차이) → 포함 아님
  ];
  const r = scoreEval(gold, cands);
  it('찾은 비율·맞은 비율', () => {
    expect(r.total).toMatchObject({ gold: 5, found: 5, matched: 3 });
    expect(r.total.recall).toBeCloseTo(3 / 5);
    expect(r.total.precision).toBeCloseTo(3 / 5);
    expect(r.byKind.character).toMatchObject({ gold: 2, matched: 2, recall: 1 });
  });
  it('놓친 것·엉뚱하게 찾은 것', () => {
    expect(r.missed.map((g) => g.name).sort()).toEqual(['금서 구역', '달빛 서고의 규칙']);
    expect(r.wrong.map((x) => x.name).sort()).toEqual(['고양이', '달빛 서고 규칙']);
  });
  it('회차 정확도, 회수 판단, 관계', () => {
    expect(r.epAccuracy).toMatchObject({ checked: 3, correct: 2 });
    expect(r.resolveAccuracy).toMatchObject({ checked: 1, correct: 1 }); // 은열쇠 open = open
    expect(r.relationRecall.found).toBe(1); // 리안–노인
    expect(r.relationRecall.checked).toBe(3);
  });
  it('짧은 이름은 포함 관계로 맞추지 않는다', () => {
    const one = scoreEval(parseGold('character,리\n').items, [c('a', 'character', '리안')]);
    expect(one.total.matched).toBe(0);
  });
});
