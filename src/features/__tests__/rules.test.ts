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

import { centerLines } from '../../components/StarMap';

describe('우주 지도 가운데 작품 제목', () => {
  it('짧으면 한 줄, 길면 여러 줄, 너무 길면 말줄임', () => {
    expect(centerLines('별의 도서관')).toEqual(['별의 도서관']);
    expect(centerLines('짧은제목')).toEqual(['짧은제목']);
    expect(centerLines('회귀한 마법사는 도서관에서 살아남기로 했다')).toEqual(['회귀한', '마법사는', '도서관에서…']);
    expect(centerLines('가나다라마바사아자차카타파하가나다라마바사').every((l) => l.length <= 6)).toBe(true);
  });
});

import { directionFor, linkEnds } from '../map/links';

describe('연결선 방향', () => {
  it('forward는 a → b, backward는 b → a, 없으면 방향 없음', () => {
    expect(linkEnds({ a: 'x', b: 'y', direction: 'forward' })).toEqual({ from: 'x', to: 'y', directed: true });
    expect(linkEnds({ a: 'x', b: 'y', direction: 'backward' })).toEqual({ from: 'y', to: 'x', directed: true });
    expect(linkEnds({ a: 'x', b: 'y' }).directed).toBe(false);
  });
  it('항목 쪽에서 본 방향', () => {
    expect(directionFor({ a: 'x', b: 'y', direction: 'backward' }, 'y')).toBe('out');
    expect(directionFor({ a: 'x', b: 'y', direction: 'backward' }, 'x')).toBe('in');
    expect(directionFor({ a: 'x', b: 'y', direction: 'none' }, 'x')).toBe('both');
  });
});

import { controlPoint, pairOffsets, pointOnCurve } from '../map/links';

describe('같은 두 별 사이의 선 두 개', () => {
  const base = { a: 'x', b: 'y', kind: 'manual' as const };
  it('선이 하나면 직선, 둘이면 서로 반대쪽으로 휜다', () => {
    expect(pairOffsets([{ ...base, id: '1', direction: 'forward' }]).get('1')).toBe(0);
    const two = pairOffsets([{ ...base, id: 'f', direction: 'forward' }, { ...base, id: 'b', direction: 'backward' }]);
    expect(two.get('f')).toBe(-35);
    expect(two.get('b')).toBe(35);
  });
  it('같은 장면 선은 휘지 않는다', () => {
    expect(pairOffsets([{ ...base, id: 'c', kind: 'co_occur' }]).has('c')).toBe(false);
  });
  it('곡선 꼭대기는 가운데에서 offset만큼 떨어진다', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    const mid = pointOnCurve(a, controlPoint(a, b, 20), b, 0.5);
    expect(mid.x).toBeCloseTo(50);
    expect(Math.abs(mid.y)).toBeCloseTo(20);
    const other = pointOnCurve(a, controlPoint(a, b, -20), b, 0.5);
    expect(Math.sign(other.y)).toBe(-Math.sign(mid.y));
  });
});

import { parseManuscript, scenesOf, splitByStarts } from '../manuscript/parse';
import { reusableScenes } from '../analysis/runRules';

describe('AI 장면 나누기', () => {
  it('회차 시작 줄과 장면 시작 줄로 나누고, 장면 위치는 회차 본문 기준', () => {
    const text = '1화 시작\n가 장면이다.\n가 계속.\n\n나 장면이다.\n2화\n다 장면이다.\n라 장면이다.';
    const r = splitByStarts(text, [
      { line: 0, title: '', heading: true, no: 1, scenes: [4] },
      { line: 5, title: '', heading: true, no: 2, scenes: [7] },
    ]);
    expect(r[0].sceneStarts).toEqual([3]);
    expect(scenesOf(r[0].body, r[0].sceneStarts!)).toEqual(['가 장면이다.\n가 계속.', '나 장면이다.']);
    expect(scenesOf(r[1].body, r[1].sceneStarts!)).toEqual(['다 장면이다.', '라 장면이다.']);
  });
  it('본문이 그대로면 지금 장면 나누기를 지키고, 바뀌었으면 다시 나눈다', () => {
    expect(reusableScenes('가 장면.\n\n나 장면.', ['가 장면.', '나 장면.'])).toEqual(['가 장면.', '나 장면.']);
    expect(reusableScenes('가 장면.\n\n나 장면을 고쳤다.', ['가 장면.', '나 장면.'])).toBeNull();
    expect(reusableScenes('본문', [])).toBeNull();
  });
});

describe('AI가 고른 시작 줄로 나누기(글자는 그대로)', () => {
  const text = '별의 도서관\n\n1화 등불\n리안이 왔다.\n\n그날 밤 세린이 웃었다.\n다음 날이 밝았다.';
  it('제목 줄은 빼서 제목으로, 본문 시작 줄은 그대로 본문에', () => {
    const r = splitByStarts(text, [
      { line: 2, title: '', heading: true, no: 1 },
      { line: 5, title: '', heading: false, no: null },
    ]);
    expect(r).toEqual([
      { no: 1, title: '1화 등불', body: '리안이 왔다.' },
      { no: null, title: '', body: '그날 밤 세린이 웃었다.\n다음 날이 밝았다.' },
    ]);
    // 자른 조각을 이으면 원고 글자가 빠지지 않는다(짧은 작품 제목 줄과 제목 줄만 빠짐)
    expect(r.map((e) => e.body).join('')).toBe('리안이 왔다.그날 밤 세린이 웃었다.\n다음 날이 밝았다.');
  });
});

describe('7.5 회차 나누기: "N화"가 아닌 표시', () => {
  const body = (t: string) => `${t} 본문이다. `.repeat(20);
  it('"1장", "Chapter 1", "#1", "1." 줄로 나누고 제목은 원래 표시 줄', () => {
    for (const [a, b] of [['1장', '2장'], ['Chapter 1', 'Chapter 2'], ['#1', '#2'], ['1.', '2.'], ['[1]', '[2]'], ['1', '2']]) {
      const r = parseManuscript('모음.txt', `${a}\n${body('첫')}\n\n${b}\n${body('둘')}`);
      expect(r.map((e) => [e.no, e.title])).toEqual([[1, a], [2, b]]);
      expect(r[1].body.startsWith('둘 본문이다.')).toBe(true);
    }
  });
  it('프롤로그가 있으면 순서대로 번호(1=프롤로그)', () => {
    const r = parseManuscript('모음.txt', `프롤로그\n${body('처음')}\n1장 만남\n${body('하나')}\n2장 이별\n${body('둘')}\n에필로그\n${body('끝')}`);
    expect(r.map((e) => [e.no, e.title])).toEqual([[1, '프롤로그'], [2, '1장 만남'], [3, '2장 이별'], [4, '에필로그']]);
  });
  it('본문 속 번호 목록(짧은 항목)은 회차로 나누지 않는다', () => {
    const r = parseManuscript('3화.txt', `그는 목록을 적었다.\n1. 사과\n2. 우유\n3. 빵\n${body('이어서')}`);
    expect(r).toHaveLength(1);
    expect(r[0].no).toBe(3);
  });
  it('"N화"가 있으면 예전처럼 그것만 쓴다', () => {
    const r = parseManuscript('모음.txt', `1화 시작\n${body('a')}\n1장\n${body('b')}\n2화 다음\n${body('c')}`);
    expect(r.map((e) => e.no)).toEqual([1, 2]);
  });
});

describe('7.5 회차 번호와 여러 회차 나누기', () => {
  it('파일명의 N화를 먼저 쓴다', () => {
    const [e] = parseManuscript('별의도서관_3화.txt', '본문 첫 줄이다.\n둘째 줄.');
    expect(e).toEqual({ no: 3, title: '', body: '본문 첫 줄이다.\n둘째 줄.' });
  });
  it('첫 줄이 회차 표시면 번호와 제목을 쓰고 본문에서 뺀다', () => {
    const [e] = parseManuscript('원고.docx', '제 12 화. 등불이 켜진 밤\n\n별의 도서관은 해가 지면 깨어난다.');
    expect(e.no).toBe(12);
    expect(e.title).toBe('등불이 켜진 밤');
    expect(e.body).toBe('별의 도서관은 해가 지면 깨어난다.');
  });
  it('본문 중간의 "제 N 화"도 찾는다', () => {
    expect(parseManuscript('원고.txt', '프롤로그 다음 이야기\n제5화를 시작한다.')[0].no).toBe(5);
  });
  it('번호가 없으면 null(화면에서 다음 번호 제안)', () => {
    expect(parseManuscript('원고.txt', '그냥 본문이다.')[0].no).toBeNull();
  });
  it('회차 표시 줄이 2개 이상이면 나눈다', () => {
    const r = parseManuscript('모음.txt', '별의 도서관\n\n1화 등불\n첫 회 본문\n\n2화 서가\n둘째 회 본문');
    expect(r.map((e) => [e.no, e.title, e.body])).toEqual([
      [1, '등불', '첫 회 본문'],
      [2, '서가', '둘째 회 본문'],
    ]);
  });
  it('"3화째"처럼 뒤에 글자가 붙은 줄은 회차 표시가 아니다', () => {
    const r = parseManuscript('4화.txt', '3화째 소식이 없었다.\n1화 등장인물이 돌아왔다는 말은 거짓이었다고 그는 아주 길게 설명하며 한숨을 쉬었다.');
    expect(r).toHaveLength(1);
    expect(r[0].no).toBe(4);
  });
});

import { ALL_TIPS, readGuide, tipKey, tipSeen, withTip, withTour, withoutTips } from '../guide/guideData';

describe('처음 사용 가이드 기억', () => {
  it('저장된 값이 없거나 이상해도 빈 상태로 읽는다', () => {
    expect(readGuide(undefined)).toEqual({});
    expect(readGuide({ tour: 'weird', tips: [1, 'map'] })).toEqual({ tour: undefined, tips: ['map'] });
  });
  it('가이드 본 표시, 도움말 닫기, 모두 끄기, 다시 켜기', () => {
    let g = withTour({}, 'skipped');
    expect(g.tour).toBe('skipped');
    g = withTip(withTip(g, 'map'), 'map');
    expect(g.tips).toEqual(['map']);
    expect(tipSeen(g, 'map')).toBe(true);
    expect(tipSeen(g, 'home')).toBe(false);
    expect(tipSeen(withTip(g, ALL_TIPS), 'home')).toBe(true);
    expect(withoutTips(g)).toEqual({ tour: 'skipped', tips: [] });
  });
});

describe('바뀐 도움말 다시 보여 주기', () => {
  it('버전 1은 예전 키 그대로, 버전이 오르면 예전에 닫았어도 다시 보이고, 모두 끄기는 그대로', () => {
    expect(tipKey('map')).toBe('map');
    expect(tipKey('home', 2)).toBe('home@2');
    const closedOld = withTip({}, 'home');
    expect(tipSeen(closedOld, tipKey('home', 1))).toBe(true);
    expect(tipSeen(closedOld, tipKey('home', 2))).toBe(false);
    expect(tipSeen(withTip(closedOld, 'home@2'), tipKey('home', 2))).toBe(true);
    expect(tipSeen(withTip({}, ALL_TIPS), tipKey('home', 2))).toBe(true);
  });
});

import { mergeRows, mergeScene, renumberFrom, splitRowAt, splitScene } from '../manuscript/edit';

describe('미리보기 표: 회차 합치기·나누기(글자는 그대로)', () => {
  const a = { key: 'a', no: '1', title: '첫', body: '가 장면.\n\n나 장면.', sceneStarts: [2] };
  const b = { key: 'b', no: '2', title: '둘', body: '다 장면.\n라 장면.', sceneStarts: [1] };
  it('AI 장면이 있는 두 회차를 합치면 장면 위치가 이어지고 합친 자리가 새 장면', () => {
    const [m] = mergeRows([a, b], 'b');
    expect(m.title).toBe('첫');
    expect(m.body).toBe('가 장면.\n\n나 장면.\n\n다 장면.\n라 장면.');
    expect(scenesOf(m.body, m.sceneStarts!)).toEqual(['가 장면.', '나 장면.', '다 장면.', '라 장면.']);
  });
  it('규칙 회차끼리 합치면 빈 줄 두 개로 이어 규칙이 장면 경계로 본다', () => {
    const [m] = mergeRows([{ ...a, sceneStarts: undefined }, { ...b, sceneStarts: undefined }], 'b');
    expect(m.sceneStarts).toBeUndefined();
    expect(splitScenes(m.body)).toEqual(['가 장면.\n\n나 장면.', '다 장면.\n라 장면.']);
  });
  it('원하는 줄에서 나누면 앞뒤 회차가 되고 장면 위치도 따라간다, 번호는 차례로', () => {
    const [m] = mergeRows([a, b], 'b');
    const r = renumberFrom(splitRowAt([m], 'a', 4, () => 'n'), 5);
    expect(r.map((x) => [x.no, x.title, x.body])).toEqual([
      ['5', '첫', '가 장면.\n\n나 장면.'],
      ['6', '', '다 장면.\n라 장면.'],
    ]);
    expect(scenesOf(r[0].body, r[0].sceneStarts!)).toEqual(['가 장면.', '나 장면.']);
    expect(scenesOf(r[1].body, r[1].sceneStarts!)).toEqual(['다 장면.', '라 장면.']);
    expect(splitRowAt([{ ...a, sceneStarts: undefined }], 'a', 2, () => 'n')[1].sceneStarts).toBeUndefined();
  });
});

describe('회차 기록: 장면 합치기·나누기(글자는 그대로)', () => {
  const body = '가 장면.\n가 계속.\n\n***\n\n나 장면.\n\n\n다 장면.';
  const scenes = ['가 장면.\n가 계속.', '나 장면.', '다 장면.'];
  it('합치면 사이의 구분선·빈 줄까지 본문 그대로', () => {
    expect(mergeScene(body, scenes, 1)).toEqual(['가 장면.\n가 계속.\n\n***\n\n나 장면.', '다 장면.']);
    expect(mergeScene(body, scenes, 0)).toBe(scenes);
  });
  it('장면 안의 줄에서 나눈다', () => {
    expect(splitScene(scenes, 0, 1)).toEqual(['가 장면.', '가 계속.', '나 장면.', '다 장면.']);
    expect(splitScene(scenes, 1, 0)).toBe(scenes);
  });
  it('합친 장면도 본문과 맞아 다음 "다시 정리" 때 그대로 지켜진다', () => {
    expect(reusableScenes(body, mergeScene(body, scenes, 1))).not.toBeNull();
  });
});

import { shortLabel, wrapLines } from '../map/labels';

describe('지도 이름 줄이기', () => {
  it('10글자 이하는 그대로, 넘으면 띄어쓰기 경계에서 자르고 말줄임', () => {
    expect(shortLabel('반쪽짜리 은열쇠', 10)).toBe('반쪽짜리 은열쇠');
    expect(shortLabel('왕립 천문대 지하 보관실', 10)).toBe('왕립 천문대 지하…');
    expect(shortLabel('왕립   천문대  지하 보관실', 10)).toBe('왕립 천문대 지하…');
  });
  it('띄어쓰기가 없거나 경계가 너무 앞이면 글자 수로 자른다', () => {
    expect(shortLabel('아주아주긴띄어쓰기없는이름입니다', 10)).toBe('아주아주긴띄어쓰기…');
    expect(shortLabel('가 나다라마바사아자차카타', 10)).toBe('가 나다라마바사아…');
  });
  it('이모지·영문도 한 글자로 센다', () => {
    expect([...shortLabel('🌙달빛 서고의 오래된 규칙서', 10)].length).toBeLessThanOrEqual(10);
    expect(shortLabel('The Silver Key of Moon', 10)).toBe('The Silve…');
  });
});

describe('가리킨 별 이름표 줄바꿈(이름표 안에서만)', () => {
  it('한 줄 글자 수에 맞춰 띄어쓰기 경계로, 긴 낱말은 쪼개고, 최대 줄 수를 넘으면 말줄임', () => {
    expect(wrapLines('왕립 천문대 지하 깊은 곳의 봉인된 보관실', 10)).toEqual(['왕립 천문대 지하', '깊은 곳의 봉인된', '보관실']);
    expect(wrapLines('짧은 이름', 10)).toEqual(['짧은 이름']);
    expect(wrapLines('달빛서고의절대깨면안되는세번째규칙', 8)).toEqual(['달빛서고의절대깨', '면안되는세번째규', '칙']);
    const many = wrapLines('가나 다라 마바 사아 자차 카타 파하', 5, 2);
    expect(many).toHaveLength(2);
    expect(many[1].endsWith('…')).toBe(true);
  });
});
