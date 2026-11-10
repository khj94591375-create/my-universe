import { describe, expect, it } from 'vitest';
import { normalize, parseTag, verifyEvidence } from './verify.ts';
import { buildContext, pickScenes, trimItems, type CtxItem } from './context.ts';
import { filterAnalysis, finishDesign, markEvidence } from './rules.ts';

const scenes = new Map([['E3-S1', '“반쪽으로는 열리지 않는다.” 등 뒤에서 목소리가 들렸다.\n노인은   웃었다...']]);

describe('8.3 근거 검증', () => {
  it('꼬리표를 읽는다', () => {
    expect(parseTag('[E3-S1]')).toEqual({ ep: 3, seq: 1 });
    expect(parseTag('3화')).toBeNull();
  });
  it('따옴표·공백·말줄임표를 맞춰 비교한다', () => {
    expect(normalize('"a"  b...')).toBe('"a" b…');
    expect(verifyEvidence('"반쪽으로는 열리지 않는다."', 'E3-S1', scenes)).toBe(true);
    expect(verifyEvidence('노인은 웃었다…', 'E3-S1', scenes)).toBe(true);
  });
  it('원고에 없는 문장, 다른 장면, 너무 짧은 문장은 거절', () => {
    expect(verifyEvidence('노인은 울었다.', 'E3-S1', scenes)).toBe(false);
    expect(verifyEvidence('등 뒤에서 목소리가 들렸다.', 'E3-S2', scenes)).toBe(false);
    expect(verifyEvidence('노인', 'E3-S1', scenes)).toBe(false);
  });
});

describe('8.2 근거 조립', () => {
  it('장면은 8개, 약 12,000자까지', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ep: 1, seq: i + 1, text: '가'.repeat(2000) }));
    const picked = pickScenes(many);
    expect(picked.length).toBe(6);
    expect(pickScenes(many.map((s) => ({ ...s, text: '짧다' }))).length).toBe(8);
  });
  it('항목이 많으면 선택·연결·오래 잊힌 순서로 줄인다', () => {
    const it = (id: string, gap: number): CtxItem => ({ id, kind: 'character', name: id, aliases: [], note: null, status: 'open', first_ep: 1, last_ep: 1, gap });
    const r = trimItems([it('a', 1), it('b', 9), it('c', 5), it('d', 2)], new Set(['d']), new Set(['a']), 3);
    expect(r.map((x) => x.id)).toEqual(['d', 'a', 'b']);
  });
  it('장면에 꼬리표를 붙이고 검증용 지도를 만든다', () => {
    const c = buildContext([], [{ no: 2, title: '서가', summary: '요약' }], [{ ep: 2, seq: 1, text: '본문' }]);
    expect(c.text).toContain('[E2-S1]\n본문');
    expect(c.text).toContain('- 2화 「서가」: 요약');
    expect(c.scenes.get('E2-S1')).toBe('본문');
  });
});

describe('AI 결과 거르기', () => {
  const ok = { evidence: '“반쪽으로는 열리지 않는다.”', tag: 'E3-S1' };
  const bad = { evidence: '지어낸 문장입니다.', tag: 'E3-S1' };
  it('8.4: 확신 0.5 미만·검증 실패·이미 있는 이름은 버린다', () => {
    const r = filterAnalysis(
      {
        summary: ' 요약 ',
        new_items: [
          { ...ok, kind: 'setting', name: '반쪽 문', note: '', look: '', confidence: 0.9 },
          { ...ok, kind: 'setting', name: '낮은 확신', note: '', look: '', confidence: 0.3 },
          { ...bad, kind: 'setting', name: '거짓 근거', note: '', look: '', confidence: 0.9 },
          { ...ok, kind: 'character', name: '리안', note: '', look: '', confidence: 0.9 },
        ],
        aliases: [{ ...ok, item_name: '리안', alias: '견습생' }, { ...ok, item_name: '없는 항목', alias: 'x' }],
        relations: [{ ...ok, a: '리안', b: '반쪽 문', label: '연다' }, { ...bad, a: '리안', b: '반쪽 문', label: '거짓' }],
        resolutions: [{ ...ok, item_name: '리안' }],
      },
      scenes,
      new Set(['리안']),
    );
    expect(r.summary).toBe('요약');
    expect(r.new_items.map((i) => i.name)).toEqual(['반쪽 문']);
    expect(r.aliases.map((a) => a.alias)).toEqual(['견습생']);
    expect(r.relations.map((x) => x.label)).toEqual(['연다']);
    expect(r.resolutions).toHaveLength(1);
  });
  it('8.6: 초안 스위치가 꺼져 있으면 draft를 지우고, 근거 없는 사용처는 null', () => {
    const out = { scenes: [{ no: 1, text: '장면', uses: [{ item: '리안', ...ok }, { item: '노인', ...bad }] }], draft: '초안' };
    const off = finishDesign(out, false, scenes);
    expect(off.draft).toBeNull();
    expect(off.scenes[0].uses.map((u) => u.evidence)).toEqual([ok.evidence, null]);
    expect(finishDesign(out, true, scenes).draft).toBe('초안');
  });
  it('가이드·대화: 검증 안 된 근거는 숨긴다', () => {
    expect(markEvidence([ok, bad], scenes).map((x) => x.evidence)).toEqual([ok.evidence, null]);
  });
});

import { buildConsistencyContext, splitSentences } from './context.ts';
import { filterIssues } from './rules.ts';

describe('7.9 설정 충돌', () => {
  const scenes = [
    { ep: 3, seq: 1, text: '리안의 파란 눈이 반짝였다. 세린이 웃었다.' },
    { ep: 7, seq: 2, text: '갈색 눈의 리안이 고개를 들었다.' },
  ];
  it('항목이 나온 문장만 꼬리표와 함께 모은다', () => {
    const c = buildConsistencyContext([{ name: '리안', aliases: [], look: '파란 눈', note: null }], scenes);
    expect(c.text).toContain('[E3-S1] 리안의 파란 눈이 반짝였다.');
    expect(c.text).toContain('[E7-S2] 갈색 눈의 리안이 고개를 들었다.');
    expect(c.text).not.toContain('세린이 웃었다');
    expect(c.text).toContain('설정집 외모: 파란 눈');
    expect(splitSentences('가. 나!\n다')).toEqual(['가.', '나!', '다']);
  });
  it('두 근거가 모두 검증되고 서로 달라야 남긴다', () => {
    const map = buildConsistencyContext([{ name: '리안', aliases: [], look: null, note: null }], scenes).scenes;
    const a = { evidence: '리안의 파란 눈이 반짝였다.', tag: 'E3-S1' };
    const b = { evidence: '갈색 눈의 리안이 고개를 들었다.', tag: 'E7-S2' };
    const fake = { evidence: '리안의 눈은 초록색이었다.', tag: 'E7-S2' };
    const r = filterIssues(
      [
        { item_name: '리안', description: '눈 색이 다르다', a, b },
        { item_name: '리안', description: '지어낸 근거', a, b: fake },
        { item_name: '리안', description: '같은 문장', a, b: a },
        { item_name: '없는 사람', description: 'x', a, b },
      ],
      map,
      new Set(['리안']),
    );
    expect(r.map((x) => x.description)).toEqual(['눈 색이 다르다']);
  });
});

import { buildImagePrompt, DEFAULT_RATIO } from './imagePrompt.ts';

describe('8.9 삽화 요청 문장', () => {
  const items = [
    { name: '리안', kind: 'character' as const, look: '열여섯 살, 짧은 갈색 머리, 남색 견습복' },
    { name: '금서 구역', kind: 'setting' as const, look: '어두운 돌계단, 손잡이 없는 검은 문' },
    { name: '세린', kind: 'character' as const, look: null },
  ];
  it('[고정] 고른 항목의 외모를 그대로 넣는다(두 번 만들어도 같다)', () => {
    const a = buildImagePrompt({ purpose: 'illustration', style: '수채 판타지', scene: '리안이 금서 구역 문 앞에 선다', items, hasReference: false });
    const b = buildImagePrompt({ purpose: 'illustration', style: '수채 판타지', scene: '다른 장면', items, hasReference: true });
    for (const p of [a, b]) {
      expect(p).toContain('- 리안: 열여섯 살, 짧은 갈색 머리, 남색 견습복');
      expect(p).toContain('- 금서 구역: 어두운 돌계단, 손잡이 없는 검은 문');
      expect(p).toContain('- 세린: (외모 정보 없음)');
    }
    expect(a).toContain('[화풍] 수채 판타지');
    expect(b).toContain('[참조]');
    expect(a).toContain('글자를 넣지 않는다.');
  });
  it('표지는 제목 자리를 비우고, 용도별 기본 비율', () => {
    expect(buildImagePrompt({ purpose: 'cover', style: '', scene: '', items: [], hasReference: false })).toContain('제목이 들어갈 자리만 비워 둔다');
    expect(DEFAULT_RATIO).toEqual({ sketch: '4:3', illustration: '4:3', cover: '3:4', sheet: '1:1' });
  });
});

import { filterSpell, type RawSpell } from './spell.ts';

describe('맞춤법 제안 거르기', () => {
  const s = (o: string, g: string, extra: Partial<RawSpell> = {}): RawSpell => ({ original: o, suggestion: g, type: 'spelling', reason: '이유', certainty: 'sure', in_dialogue: false, ...extra });
  const text = '리안은 할수 있다고 생각했다. "몰라유, 지가 우째 알아유." 은열쇠가 반짝였다. 그는 그 그 문을 열었다.';
  it('원고에 글자 그대로 있는 제안만 남긴다', () => {
    const r = filterSpell(text, [s('할수 있다', '할 수 있다', { type: 'spacing' }), s('없는 문장', '고친 문장')], []);
    expect(r.kept.map((k) => k.original)).toEqual(['할수 있다']);
    expect(r.dropped).toBe(1);
  });
  it('고유명사·사전 단어를 바꾸는 제안은 버린다', () => {
    const r = filterSpell(text, [s('은열쇠가', '은 열쇠가', { type: 'spacing' }), s('리안은', '리인은')], ['은열쇠', '리안']);
    expect(r.kept).toEqual([]);
  });
  it('대사 안 제안은 늘 "확인 필요"', () => {
    const r = filterSpell(text, [s('몰라유', '몰라요', { in_dialogue: true })], []);
    expect(r.kept[0].certainty).toBe('check');
  });
  it('문장을 통째로 다시 쓰는 제안은 버린다', () => {
    const r = filterSpell(text, [s('리안은 할수 있다고 생각했다.', '리안은 자신이 해낼 수 있으리라 확신하며 고개를 끄덕였다.', { type: 'style' })], []);
    expect(r.kept).toEqual([]);
  });
  it('같은 제안은 한 번만, 바뀌는 게 없으면 버린다', () => {
    const r = filterSpell(text, [s('그 그', '그'), s('그 그', '그'), s('문을', '문을')], []);
    expect(r.kept).toHaveLength(1);
  });
});

import { itemsInQuestion, keepVerified } from './ask.ts';

describe('세계관 질문하기', () => {
  const items = [
    { id: 'a', name: '리안', aliases: ['견습생'] },
    { id: 'b', name: '반쪽짜리 은열쇠', aliases: ['은열쇠'] },
    { id: 'c', name: '세린', aliases: ['린'] }, // 한 글자 별칭은 무시
  ];
  it('질문에 나온 이름·별칭으로 항목을 찾는다(긴 이름 우선, 한 글자 별칭 무시)', () => {
    expect(itemsInQuestion('견습생이 은열쇠를 처음 본 회차는?', items).sort()).toEqual(['a', 'b']);
    expect(itemsInQuestion('반쪽짜리 은열쇠와 리안', items)).toEqual(['b', 'a']);
    expect(itemsInQuestion('린이 누구야?', items)).toEqual([]);
    expect(itemsInQuestion('달빛 서고 규칙', items)).toEqual([]);
  });
  it('원고에 글자 그대로 있는 근거만 남기고 중복을 뺀다', () => {
    const scenes = new Map([['E2-S1', '리안은 은열쇠를 처음 손에 쥐었다. 차가웠다.']]);
    const r = keepVerified(
      [
        { text: '리안은 은열쇠를 처음 손에 쥐었다.', tag: 'E2-S1' },
        { text: '리안은 은열쇠를 처음 손에 쥐었다.', tag: 'E2-S1' },
        { text: '리안은 열쇠를 버렸다.', tag: 'E2-S1' },
        { text: '리안은 은열쇠를 처음 손에 쥐었다.', tag: 'E3-S1' },
      ],
      scenes,
    );
    expect(r.evidence).toEqual([{ text: '리안은 은열쇠를 처음 손에 쥐었다.', tag: 'E2-S1', ep: 2 }]);
    expect(r.dropped).toBe(2);
  });
});

import { finishProfile } from './profile.ts';

describe('인물 소개 카드', () => {
  it('근거가 확인된 항목만 남기고, 근거 없는 항목은 비운다', () => {
    const scenes = new Map([['E1-S1', '리안은 잿빛 망토를 걸쳤다. "괜찮아요, 사서님." 리안이 웃었다.']]);
    const r = finishProfile(
      {
        look: { text: '잿빛 망토를 걸친다.', evidence: [{ text: '리안은 잿빛 망토를 걸쳤다.', tag: 'E1-S1' }] },
        personality: { text: '용감하다.', evidence: [{ text: '리안은 용감하게 뛰어들었다.', tag: 'E1-S1' }] },
        speech: { text: '공손한 존댓말.', evidence: [] },
      },
      scenes,
    );
    expect(r.look.text).toBe('잿빛 망토를 걸친다.');
    expect(r.look.evidence[0].ep).toBe(1);
    expect(r.personality).toEqual({ text: '', evidence: [] });
    expect(r.speech).toEqual({ text: '', evidence: [] });
    expect(r.dropped).toBe(1);
  });
});

import { finishAlternatives } from './unstick.ts';

describe('막힌 장면 대안 전개', () => {
  it('설정집에 없는 항목은 빼고, 근거가 확인 안 되면 근거만 비우고, 대안은 3개까지', () => {
    const scenes = new Map([['E3-S2', '노인은 은열쇠를 내려다보며 말이 없었다.']]);
    const opt = (title: string) => ({
      title,
      plan: '노인이 정체를 밝힌다.',
      uses: [
        { item: '검은 망토의 노인', evidence: '노인은 은열쇠를 내려다보며 말이 없었다.', tag: 'E3-S2' },
        { item: '반쪽짜리 은열쇠', evidence: '은열쇠가 빛났다.', tag: 'E3-S2' },
        { item: '새 인물', evidence: '노인은 은열쇠를 내려다보며 말이 없었다.', tag: 'E3-S2' },
      ],
      caution: '',
    });
    const r = finishAlternatives([opt('가'), opt('나'), opt('다'), opt('라'), { ...opt(''), title: ' ' }], scenes, new Set(['검은 망토의 노인', '반쪽짜리 은열쇠']));
    expect(r.map((o) => o.title)).toEqual(['가', '나', '다']);
    expect(r[0].uses).toEqual([
      { item: '검은 망토의 노인', evidence: '노인은 은열쇠를 내려다보며 말이 없었다.', ep: 3 },
      { item: '반쪽짜리 은열쇠', evidence: null, ep: null },
    ]);
  });
});

import { keepTraits, sampleBodies } from './style.ts';

describe('문체 분석', () => {
  it('원고에 있는 예시만 남기고, 예시 없는 특징은 뺀다', () => {
    const src = '리안은 멈췄다. 숨을 골랐다. "괜찮아요…" 그녀가 속삭였다.';
    const r = keepTraits(
      [
        { name: '짧은 문장', description: '짧게 끊는다.', examples: ['리안은 멈췄다.', '숨을 골랐다.', '리안은 달렸다.'] },
        { name: '지어낸 예시', description: '설명', examples: ['원고에 없는 문장이다.'] },
        { name: '말줄임표', description: '대사를 흐린다.', examples: ['"괜찮아요..."'] },
      ],
      src,
    );
    expect(r.traits.map((t) => t.name)).toEqual(['짧은 문장', '말줄임표']);
    expect(r.traits[0].examples).toEqual(['리안은 멈췄다.', '숨을 골랐다.']);
    expect(r.dropped).toBe(2);
  });
  it('표본은 회차마다 고르게, 최대 글자 수 이하', () => {
    const long = '가'.repeat(5000);
    const s = sampleBodies([long, long, long], 3000);
    expect([...s].length).toBeLessThanOrEqual(3000);
    expect(sampleBodies(['', '  '])).toBe('');
  });
});
