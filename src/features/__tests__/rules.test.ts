import { describe, expect, it } from 'vitest';
import { gapLabel, gapOf, nextEp } from '../foreshadow/gap';
import { pickSlumpItem } from '../foreshadow/slump';
import { reuseScore } from '../foreshadow/reuse';
import { josa } from '../foreshadow/josa';
import { templateGuide } from '../foreshadow/guideTemplate';
import { detectAppearances, findInText, searchTerms } from '../analysis/detect';
import { computeCoOccur } from '../analysis/cooccur';
import { splitScenes, splitSentences, trimEvidence } from '../analysis/split';

describe('7.1 미등장 회차 수', () => {
  it('다음 회차는 가장 큰 번호 + 1, 없으면 1', () => {
    expect(nextEp([1, 2, 6, 3])).toBe(7);
    expect(nextEp([])).toBe(1);
  });
  it('gap = 다음 회차 − 마지막 등장, 등장 없으면 null', () => {
    expect(gapOf(7, 2)).toBe(5);
    expect(gapOf(7, null)).toBeNull();
  });
  it('GapTag 문구와 색', () => {
    expect(gapLabel(0)).toEqual({ text: '이번 화 등장', tone: 'ok' });
    expect(gapLabel(2)).toEqual({ text: '2화째 미등장', tone: 'neutral' });
    expect(gapLabel(3).tone).toBe('warn');
  });
});

describe('7.2 막혔어요 선택', () => {
  const items = [
    { id: 'a', status: 'open', gap: 5 },
    { id: 'b', status: 'reuse_planned', gap: 5 },
    { id: 'c', status: 'open', gap: 2 },
    { id: 'd', status: 'resolved', gap: 9 },
    { id: 'e', status: 'open', gap: null },
  ];
  it('gap이 가장 큰 open·reuse_planned 중에서 고른다', () => {
    expect(pickSlumpItem(items, null, () => 0)).toBe('a');
    expect(pickSlumpItem(items, null, () => 0.99)).toBe('b');
  });
  it('직전에 고른 항목은 한 번 뺀다', () => {
    expect(pickSlumpItem(items, 'a', () => 0)).toBe('b');
    expect(pickSlumpItem([{ id: 'a', status: 'open', gap: 1 }], 'a')).toBe('a');
  });
  it('후보가 없으면 null', () => {
    expect(pickSlumpItem([{ id: 'd', status: 'resolved', gap: 9 }])).toBeNull();
  });
});

describe('7.3 재등장 감지', () => {
  it('띄어 쓴 이름은 3글자 이상 마지막 단어로도 찾는다', () => {
    expect(searchTerms({ name: '반쪽짜리 은열쇠', aliases: [] })).toContain('은열쇠');
    expect(searchTerms({ name: '금서 구역', aliases: [] })).not.toContain('구역');
  });
  it('별칭으로 찾고, 일치한 문장을 근거로 돌려준다', () => {
    const text = '해가 졌다. 견습생은 책을 꽂았다! 문이 닫혔다.';
    expect(findInText(text, { name: '리안', aliases: ['견습생'] })).toBe('견습생은 책을 꽂았다!');
  });
  it('장면마다 항목을 찾는다', () => {
    const r = detectAppearances(
      [{ id: 'c1', text: '리안이 은열쇠를 쥐었다.' }, { id: 'c2', text: '아무도 없었다.' }],
      [{ id: 'i1', name: '리안', aliases: [] }, { id: 'i2', name: '반쪽짜리 은열쇠', aliases: [] }],
    );
    expect(r.map((d) => `${d.chunkId}:${d.itemId}`)).toEqual(['c1:i1', 'c1:i2']);
  });
  it('근거 문장은 120자로 자르되 원문 그대로다', () => {
    const long = '가'.repeat(200) + '은열쇠' + '나'.repeat(50);
    const ev = trimEvidence(long, '은열쇠');
    expect(ev.length).toBe(120);
    expect(ev).toContain('은열쇠');
    expect(long.includes(ev)).toBe(true);
  });
});

describe('7.4 같은 장면 연결선', () => {
  it('함께 나온 쌍마다 weight를 세고, 60% 이상 장면에 나오는 항목은 뺀다', () => {
    const m = new Map([
      ['c1', new Set(['hero', 'x', 'y'])],
      ['c2', new Set(['hero', 'x', 'y'])],
      ['c3', new Set(['hero', 'z'])],
      ['c4', new Set(['w'])],
      ['c5', new Set(['hero'])],
    ]);
    expect(computeCoOccur(m, 5)).toEqual([{ a: 'x', b: 'y', weight: 2 }]);
  });
});

describe('7.6 장면·문장 나누기', () => {
  it('구분 기호와 빈 줄 2개로 장면을 나눈다', () => {
    expect(splitScenes('하나\n***\n둘\n\n\n셋\n◇\n넷')).toEqual(['하나', '둘', '셋', '넷']);
  });
  it('긴 장면은 문단 경계에서 나눈다', () => {
    const para = '가'.repeat(600);
    const scenes = splitScenes([para, para, para, para].join('\n'));
    expect(scenes.length).toBeGreaterThan(1);
    expect(scenes.every((s) => s.length <= 1500)).toBe(true);
  });
  it('문장은 마침표·따옴표 뒤에서 나눈다', () => {
    expect(splitSentences('“안녕.” 그가 말했다. 정말?\n그래')).toEqual(['“안녕.”', '그가 말했다.', '정말?', '그래']);
  });
});

describe('7.7 재사용 가능성', () => {
  it('최근 2회차 안이면 높음, 5회차 안이면 보통, 아니면 낮음', () => {
    expect(reuseScore(6, [{ name: '세린', lastEp: 6 }]).level).toBe('high');
    expect(reuseScore(6, [{ name: '세린', lastEp: 6 }]).reason).toBe('연결된 「세린」이 최근 회차에 활동 중이에요');
    expect(reuseScore(6, [{ name: '노인', lastEp: 3 }]).level).toBe('mid');
    expect(reuseScore(9, [{ name: '노인', lastEp: 2 }]).level).toBe('low');
    expect(reuseScore(6, []).level).toBe('low');
  });
});

describe('7.8 기본 가이드 템플릿', () => {
  it('조사를 받침에 맞춰 고른다', () => {
    expect(josa('은열쇠', '을/를')).toBe('은열쇠를');
    expect(josa('세린', '이/가')).toBe('세린이');
    expect(josa('「리안」', '은/는')).toBe('「리안」은');
    expect(josa('서울', '으로/로')).toBe('서울로');
    expect(josa('도서관', '으로/로')).toBe('도서관으로');
    expect(josa('A', '을/를')).toBe('A을(를)');
  });
  it('시작 문장과 방향 3개를 만든다', () => {
    const g = templateGuide('foreshadow', '반쪽짜리 은열쇠', 3);
    expect(g.opening).toBe('“반쪽짜리 은열쇠”—그 이름을 다시 떠올린 건 3화 이후 처음이었다.');
    expect(g.directions.map((d) => d.title)).toEqual(['회수', '반전', '암시']);
    expect(g.directions[0].body).toBe('지금 장면의 문제를 푸는 결정적 단서로 「반쪽짜리 은열쇠」를 다시 꺼내 보세요.');
  });
});

import { layoutStars, starOpacity } from '../map/layout';

describe('6.7 우주 지도 배치', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}`, kind: (['character', 'setting', 'foreshadow'] as const)[i % 3], name: `항목${i}` }));
  it('모든 항목에 위치가 있고 겹치지 않는다(방사형)', () => {
    const pos = layoutStars(mk(20), []);
    expect(pos.size).toBe(20);
    const pts = [...pos.values()];
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(30);
  });
  it('30개를 넘으면 force 배치로 바뀌어도 위치가 모두 있다', () => {
    const pos = layoutStars(mk(60), []);
    expect(pos.size).toBe(60);
    expect([...pos.values()].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
  it('별 밝기는 gap이 클수록 희미하고 최소 0.35', () => {
    expect(starOpacity(null, 5)).toBe(1);
    expect(starOpacity(5, 5)).toBeCloseTo(0.35);
    expect(starOpacity(1, 5)).toBeGreaterThan(starOpacity(4, 5));
  });
});
