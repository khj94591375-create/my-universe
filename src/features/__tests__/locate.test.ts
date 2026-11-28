import { describe, expect, it } from 'vitest';
import { contextAround, locateEvidence } from '../analysis/locate';

const BODY = '첫 문장이다. 둘째 문장이다.\n“등불을 꺼.” 세린이 말했다. 리안은 고개를 끄덕였다... 그리고 문을 닫았다. 마지막 문장이다.';

describe('근거 문장 찾기·앞뒤 원문', () => {
  it('따옴표 모양·공백·말줄임 차이가 있어도 찾는다', () => {
    const r = locateEvidence(BODY, '"등불을 꺼." 세린이   말했다.');
    expect(r).not.toBeNull();
    expect(BODY.slice(r!.start, r!.end)).toBe('“등불을 꺼.” 세린이 말했다.');
    const r2 = locateEvidence(BODY, '리안은 고개를 끄덕였다…');
    expect(BODY.slice(r2!.start, r2!.end)).toBe('리안은 고개를 끄덕였다');
  });
  it('본문에 없거나 너무 짧으면 null', () => {
    expect(locateEvidence(BODY, '없는 문장입니다')).toBeNull();
    expect(locateEvidence(BODY, '첫')).toBeNull();
  });
  it('앞뒤 2문장을 붙이고, 잘린 쪽을 알려 준다', () => {
    const r = locateEvidence(BODY, '세린이 말했다.')!;
    const c = contextAround(BODY, r.start, r.end, 2, 300);
    expect(c.match).toBe('세린이 말했다.');
    expect(c.before).toBe('둘째 문장이다.\n“등불을 꺼.” ');
    expect(c.after).toBe(' 리안은 고개를 끄덕였다... 그리고 문을 닫았다.');
    expect(c.cutBefore).toBe(true);
    expect(c.cutAfter).toBe(true);
  });
  it('길면 최대 글자 수에서 자른다', () => {
    const long = '가'.repeat(500) + ' 근거 문장이다. ' + '나'.repeat(500);
    const r = locateEvidence(long, '근거 문장이다.')!;
    const c = contextAround(long, r.start, r.end, 2, 100);
    expect(c.before.length).toBe(100);
    expect(c.after.length).toBeLessThanOrEqual(100);
  });
});
