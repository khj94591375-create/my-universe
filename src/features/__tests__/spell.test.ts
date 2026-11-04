import { describe, expect, it } from 'vitest';
import { ruleSuggestions } from '../spell/rules';
import { applyAccepted, countByType, locateAi, mergeSuggestions, splitForCheck } from '../spell/text';
import type { Decision } from '../spell/types';

const body = [
  '리안은 그 문을 열수 있었다.  세린이 웃었다 .',
  '"몰라유, 지가 우째 알아유. 그 그 사람이 뭔디유."',
  '은열쇠가 반짝였다. 금새 어두워졌다. 일이 되요.',
].join('\n');

describe('기본 규칙 검사', () => {
  const found = ruleSuggestions(body);
  const pick = (o: string) => found.find((f) => f.original === o);
  it('띄어쓰기 오류(열수 있 → 열 수 있, 두 칸 공백, 문장부호 앞 공백)', () => {
    expect(pick('열수 있')?.suggestion).toBe('열 수 있');
    expect(found.some((f) => f.type === 'spacing' && f.original.includes('  '))).toBe(true);
    expect(found.some((f) => f.type === 'punctuation' && f.suggestion === '다.')).toBe(true);
  });
  it('자주 틀리는 표현(금새 → 금세, 되요 → 돼요)', () => {
    expect(pick('금새')?.suggestion).toBe('금세');
    expect(pick('되요')?.suggestion).toBe('돼요');
  });
  it('대사 안(사투리·말 더듬기)은 "확인 필요"로 표시하고 고치지 않는다', () => {
    const dup = found.find((f) => f.original === '그 그');
    expect(dup?.inDialogue).toBe(true);
    expect(dup?.certainty).toBe('check');
    expect(found.some((f) => f.original.includes('몰라유'))).toBe(false);
  });
  it('위치(start·end)가 원고와 정확히 맞는다', () => {
    for (const f of found) expect(body.slice(f.start, f.end)).toBe(f.original);
  });
});

describe('AI 제안 위치 찾기와 합치기', () => {
  const parts = splitForCheck(body);
  it('같은 표현이 여러 번 나오면 모두 제안(중복 표현)', () => {
    const text = '그는 할수있다. 그녀도 할수있다.';
    const got = locateAi({ start: 0, text }, [{ original: '할수있다', suggestion: '할 수 있다', type: 'spacing', reason: 'r', certainty: 'sure', in_dialogue: false }], text);
    expect(got).toHaveLength(2);
  });
  it('고유명사·작품 사전 표현은 제안에서 뺀다', () => {
    const ai = locateAi(parts[0], [
      { original: '은열쇠가', suggestion: '은 열쇠가', type: 'spacing', reason: 'r', certainty: 'sure', in_dialogue: false },
      { original: '뭔디유', suggestion: '뭔데요', type: 'spelling', reason: 'r', certainty: 'sure', in_dialogue: true },
    ], body);
    const merged = mergeSuggestions(body, [ai, ruleSuggestions(body)], ['은열쇠', '리안'], ['뭔디유']);
    expect(merged.some((m) => m.original === '은열쇠가')).toBe(false);
    expect(merged.some((m) => m.original === '뭔디유')).toBe(false);
  });
  it('겹치는 제안은 하나만 남긴다', () => {
    const ai = locateAi(parts[0], [{ original: '열수 있었다', suggestion: '열 수 있었다', type: 'spacing', reason: 'r', certainty: 'sure', in_dialogue: false }], body);
    const merged = mergeSuggestions(body, [ai, ruleSuggestions(body)], [], []);
    const at = merged.filter((m) => m.original.includes('열수'));
    expect(at).toHaveLength(1);
    expect(at[0].source).toBe('ai');
  });
});

describe('교정본 만들기', () => {
  const list = mergeSuggestions(body, [ruleSuggestions(body)], [], []);
  it('"수정 적용"만 반영하고 원고는 그대로', () => {
    const before = body;
    const decisions: Record<string, Decision> = {};
    for (const s of list) decisions[s.id] = s.original === '금새' ? 'apply' : 'keep';
    const out = applyAccepted(body, list, decisions);
    expect(body).toBe(before);
    expect(out).toContain('금세');
    expect(out).toContain('열수 있었다'); // 원문 유지
  });
  it('아무것도 고르지 않으면 원고와 같다', () => {
    expect(applyAccepted(body, list, {})).toBe(body);
  });
  it('유형별 건수', () => {
    expect(Object.values(countByType(list)).reduce((a, b) => a + b, 0)).toBe(list.length);
  });
});

describe('긴 원고 나누기', () => {
  it('3,000자 묶음으로 나누고, 이어 붙이면 원고와 같다', () => {
    const text = Array.from({ length: 400 }, (_, i) => `${i}번째 문장은 리안이 서고를 걸어가는 장면이다.${i % 5 ? ' ' : '\n'}`).join('');
    const parts = splitForCheck(text);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.every((p) => p.text.length <= 3000)).toBe(true);
    expect(parts.map((p) => p.text).join('')).toBe(text);
    for (const p of parts) expect(text.slice(p.start, p.start + p.text.length)).toBe(p.text);
  });
  it('줄바꿈 없는 아주 긴 문단도 나눈다', () => {
    const text = '가나다라마바사. '.repeat(1000);
    const parts = splitForCheck(text);
    expect(parts.every((p) => p.text.length <= 3000)).toBe(true);
    expect(parts.map((p) => p.text).join('')).toBe(text);
  });
});

describe('띄어쓰기 규칙 더', () => {
  it('할것같다 → 할 것 같다, 비가 올것 같다, 그것같은(그것 + 같은)은 그대로', () => {
    const t = '할것같다. 비가 올것 같다. 그런것같아. 그것같은 건 없다.';
    const got = ruleSuggestions(t).map((r) => `${r.original}→${r.suggestion}`);
    expect(got).toContain('할것같→할 것 같');
    expect(got).toContain('올것 같→올 것 같');
    expect(got).toContain('런것같→런 것 같');
    expect(got.some((g) => g.startsWith('그것같'))).toBe(false);
  });
});
