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
