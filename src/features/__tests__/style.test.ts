import { describe, expect, it } from 'vitest';
import { narrationSentences, styleStats } from '../style/stats';

describe('문체 통계(브라우저 안)', () => {
  const body = [
    '리안은 서고 문을 열었다. 먼지가 날렸다. 리안은 천천히 걸었다.',
    '"누구세요?" 리안이 물었다.',
    '세린은 대답하지 않았다… 세린은 창밖을 보았다. 리안은 천천히 다가갔다.',
    '"괜찮아." 리안은 천천히 웃는다!',
  ].join('\n');

  it('대사를 빼고 서술 문장만 나눈다', () => {
    const s = narrationSentences(body);
    expect(s).toContain('리안은 서고 문을 열었다.');
    expect(s.some((x) => x.includes('누구세요'))).toBe(false);
  });

  it('대사 비율, 과거형/현재형, 자주 쓰는 낱말·묶음, 문장부호를 센다', () => {
    const st = styleStats([body]);
    expect(st.dialogueRatio).toBeGreaterThan(0.05);
    expect(st.dialogueRatio).toBeLessThan(0.3);
    expect(st.tense.past).toBeGreaterThan(st.tense.present);
    expect(st.tense.present).toBe(1);
    expect(st.words.find((w) => w.text === '리안')?.count).toBeGreaterThanOrEqual(4);
    expect(st.words.find((w) => w.text === '천천히')?.count).toBe(3);
    expect(st.phrases.map((p) => p.text)).toContain('리안은 천천히');
    expect(st.marks.ellipsis).toBeGreaterThan(0);
  });

  it('빈 원고도 오류 없이 0', () => {
    const st = styleStats(['']);
    expect(st.sentences).toBe(0);
    expect(st.avgSentence).toBe(0);
    expect(st.dialogueRatio).toBe(0);
  });
});
