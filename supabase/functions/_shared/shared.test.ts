import { describe, expect, it } from 'vitest';
import { normalize, parseTag, verifyEvidence } from './verify.ts';
import { buildContext, pickScenes, trimItems, type CtxItem } from './context.ts';
import { filterAnalysis, finishDesign, markEvidence, trimAtSentence } from './rules.ts';

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

import { buildImagePrompt, DEFAULT_RATIO, numberReferences } from './imagePrompt.ts';

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

describe('8.9 참조 이미지 번호', () => {
  const pick = (name: string, hasRef: boolean, look: string | null = null) => ({ name, kind: 'character' as const, look, hasRef });
  it('이미지 시트가 있는 항목만 고른 순서대로 번호, 다시 그리기 원본은 마지막, 4장까지', () => {
    const r = numberReferences([pick('리안', true), pick('노인', false), pick('세린', true)], true);
    expect(r.items.map((i) => i.ref)).toEqual([1, undefined, 2]);
    expect(r.redrawRef).toBe(3);
    const many = numberReferences(['가', '나', '다', '라', '마'].map((n) => pick(n, true)), true);
    expect(many.items.map((i) => i.ref)).toEqual([1, 2, 3, undefined, undefined]);
    expect(many.redrawRef).toBe(4);
    expect(numberReferences([pick('리안', true)], false).redrawRef).toBeUndefined();
  });
  it('요청 문장: 누구의 참조 이미지인지 적고, 외모가 없으면 참조 이미지 모습 그대로', () => {
    const { items, redrawRef } = numberReferences([pick('리안', true, '짧은 갈색 머리'), pick('세린', true), pick('노인', false)], false);
    const p = buildImagePrompt({ purpose: 'illustration', style: '', scene: '', items: items.map(({ name, kind, look, ref }) => ({ name, kind, look, ref })), hasReference: true, redrawRef });
    expect(p).toContain('- 리안: 짧은 갈색 머리 (참조 이미지 1번)');
    expect(p).toContain('- 세린: 참조 이미지 2번의 모습 그대로');
    expect(p).toContain('- 노인: (외모 정보 없음)');
    expect(p).toContain('[참조] 참조 이미지 1번 = 리안, 2번 = 세린.');
    expect(p).toContain('서로 섞지 않는다');
    const r2 = buildImagePrompt({ purpose: 'illustration', style: '', scene: '', items: [], hasReference: true, redrawRef: 1 });
    expect(r2).toContain('[참조] 참조 이미지 1번 = 원본 그림(구도·분위기 참고).');
  });
});

import { checkStarts, numberLines } from './split.ts';

describe('AI 회차 나누기(자르는 위치만)', () => {
  const text = '별의 도서관\n\n1화 등불\n리안이 왔다.\n\n2화 서가\n세린이 웃었다.';
  it('빈 줄이 아닌 줄에만 번호, 원래 줄 위치를 기억', () => {
    const r = numberLines(text);
    expect(r.numbered.split('\n')[1]).toBe('[2] 1화 등불');
    expect(r.map).toEqual([0, 2, 3, 5, 6]);
  });
  it('범위 밖·중복 버림, 순서 정렬, 첫 회차는 맨 앞 줄부터', () => {
    const { map } = numberLines(text);
    const s = checkStarts(
      [
        { start_line: 4, title: '서가', heading: true, no: 2 },
        { start_line: 2, title: '등불', heading: true, no: 1 },
        { start_line: 4, title: '중복', heading: true, no: 2 },
        { start_line: 99, title: '없음', heading: false, no: 0 },
      ],
      map,
    );
    expect(s).toEqual([
      { line: 2, title: '등불', heading: true, no: 1, scenes: [] },
      { line: 5, title: '서가', heading: true, no: 2, scenes: [] },
    ]);
    expect(checkStarts([], map)).toEqual([{ line: 0, title: '', heading: false, no: null, scenes: [] }]);
  });
  it('장면 시작 줄: 회차 범위 안만, 제목 줄 바로 다음(첫 장면)은 빼고, 원래 줄 위치로', () => {
    const t = '1화\n가 장면\n가 계속\n나 장면\n2화\n다 장면\n라 장면';
    const { map } = numberLines(t);
    const s = checkStarts(
      [
        { start_line: 1, title: '', heading: true, no: 1, scene_lines: [2, 4, 4, 6, 99] },
        { start_line: 5, title: '', heading: true, no: 2, scene_lines: [7, 3] },
      ],
      map,
    );
    expect(s.map((x) => x.scenes)).toEqual([[3], [6]]);
  });
});

import { emailAllowed, parseEmailList } from './allow.ts';

describe('삽화 사용 제한(IMAGE_ALLOWED_EMAILS)', () => {
  it('목록이 비면 모두, 있으면 목록의 이메일만(대소문자·공백 무시)', () => {
    expect(emailAllowed('', 'a@b.com')).toBe(true);
    expect(emailAllowed('', null)).toBe(true);
    expect(emailAllowed(' Me@Mail.com , you@mail.com', 'me@mail.com')).toBe(true);
    expect(emailAllowed('me@mail.com', 'other@mail.com')).toBe(false);
    expect(emailAllowed('me@mail.com', null)).toBe(false);
  });
  it('손으로 적은 값을 너그럽게: 따옴표·꺾쇠·mailto·이름=·세미콜론·줄바꿈', () => {
    expect(parseEmailList('IMAGE_ALLOWED_EMAILS="me@mail.com"; <you@mail.com>\nmailto:him@mail.com.')).toEqual(['me@mail.com', 'you@mail.com', 'him@mail.com']);
    expect(emailAllowed("'me@mail.com'", 'me@mail.com')).toBe(true);
  });
  it('지메일은 점·+태그·googlemail을 같은 계정으로, 다른 주소의 점은 그대로', () => {
    expect(emailAllowed('kimhj@gmail.com', 'kim.hj@gmail.com')).toBe(true);
    expect(emailAllowed('Kim.HJ+test@googlemail.com', 'kimhj@gmail.com')).toBe(true);
    expect(emailAllowed('kimhj@naver.com', 'kim.hj@naver.com')).toBe(false);
  });
});

describe('본문 초안 길이(문장 중간에서 자르지 않음)', () => {
  it('짧으면 그대로, 넘으면 마지막 문장 끝에서, 닫는 따옴표 포함, 문장 끝이 없으면 말줄임', () => {
    expect(trimAtSentence('짧은 초안이다.', 300)).toBe('짧은 초안이다.');
    expect(trimAtSentence('첫 문장이다. 둘째 문장은 아주 길어서 넘친다', 12)).toBe('첫 문장이다.');
    expect(trimAtSentence('"괜찮아?" 그가 물었다 그리고', 10)).toBe('"괜찮아?"');
    expect(trimAtSentence('끝맺음없이계속이어지는아주긴문장', 8)).toBe('끝맺음없이계속…');
  });
  it('finishDesign: 길이를 받아 쓰고, 스위치가 꺼져 있으면 초안 없음([고정])', () => {
    const long = '가'.repeat(700) + '.';
    const out = { scenes: [], draft: `${long} ${'나'.repeat(200)}.` };
    expect(finishDesign(out, true, new Map(), 800).draft).toBe(long);
    expect(finishDesign(out, true, new Map(), 300).draft!.length).toBe(300);
    expect(finishDesign(out, false, new Map(), 800).draft).toBeNull();
  });
});

import { pickEnding, buildContext as buildCtx2 } from './context.ts';
import { finishEnding } from './rules.ts';

describe('직전 회차에서 이어 쓰기', () => {
  const sc = (seq: number, text: string) => ({ ep: 1, seq, text });
  it('마지막 장면 2개를 순서대로, 합계가 넘치면 앞 장면을 빼고, 한 장면이 너무 길면 끝부분만(문장 경계부터)', () => {
    expect(pickEnding([sc(3, 'c'), sc(1, 'a'), sc(2, 'b')]).map((x) => x.seq)).toEqual([2, 3]);
    expect(pickEnding([sc(1, 'a'.repeat(2000)), sc(2, 'b'.repeat(1000))]).map((x) => x.seq)).toEqual([2]);
    const long = '앞 문장이다. '.repeat(400) + '마지막 문장이다.';
    const [tail] = pickEnding([sc(1, long)], 2, 300);
    expect(long.includes(tail.text)).toBe(true); // 원래 글자의 일부(근거 검증이 통함)
    expect(tail.text.length).toBeLessThanOrEqual(300);
    expect(tail.text.endsWith('마지막 문장이다.')).toBe(true);
    expect(tail.text.startsWith('앞 문장이다.')).toBe(true); // 문장 중간부터 시작하지 않음
    expect(pickEnding([])).toEqual([]);
  });
  it('직전 회차 끝 장면은 자료 맨 앞에, 같은 장면은 한 번만, 근거 검증용으로도', () => {
    const ctx = buildCtx2([], [], [sc(2, '가운데'), sc(1, '처음')], { ep: 1, title: '등불', scenes: [sc(2, '가운데')] });
    expect(ctx.text.startsWith('## 직전 회차(1화 「등불」)의 마지막 장면')).toBe(true);
    expect(ctx.text.split('[E1-S2]').length - 1).toBe(1);
    expect(ctx.hasEnding).toBe(true);
    expect(ctx.scenes.get('E1-S2')).toBe('가운데');
    expect(buildCtx2([], [], []).hasEnding).toBe(false);
  });
  it('끝 상황: 직전 회차가 없으면 null, 근거는 원고에 있을 때만', () => {
    const scenes = new Map([['E1-S2', '세린은 등불을 끄고 서고를 나섰다.']]);
    const e = { place: '서고', time: '밤', pov: '3인칭 세린', people: '세린', last_moment: '등불을 끄고 나섬', tension: '노인의 정체', evidence: '세린은 등불을 끄고 서고를 나섰다.', tag: 'E1-S2' };
    expect(finishEnding(e, true, scenes)?.evidence).toBe('세린은 등불을 끄고 서고를 나섰다.');
    expect(finishEnding({ ...e, evidence: '지어낸 문장이다.' }, true, scenes)?.evidence).toBeNull();
    expect(finishEnding(e, false, scenes)).toBeNull();
    expect(finishEnding({ place: '', time: '', pov: '', people: '', last_moment: '', tension: '', evidence: '', tag: '' }, true, scenes)).toBeNull();
  });
});
