/*
 * 문체 통계(브라우저 안에서만 계산, 외부 전송 없음). 좋고 나쁨을 판단하지 않고 숫자만 보여 준다.
 */

export type StyleStats = {
  chars: number;
  sentences: number;
  avgSentence: number; // 서술 문장 평균 글자 수
  dialogueRatio: number; // 따옴표 안 글자 비율(0~1)
  avgParagraph: number; // 문단 평균 글자 수
  tense: { past: number; present: number }; // 서술 문장 끝(~었다 / ~다)
  endings: { text: string; count: number }[]; // 자주 쓰는 문장 끝(서술)
  words: { text: string; count: number }[]; // 자주 쓰는 낱말(조사 떼고)
  phrases: { text: string; count: number }[]; // 자주 나오는 두 어절 묶음
  marks: { ellipsis: number; dash: number; exclaim: number; question: number }; // 1,000자당
};

const QUOTES = /["“”「」『』]/;
const DIALOGUE = /["“][^"“”]*["”]|「[^」]*」|『[^』]*』/g;
const JOSA = ['에게서', '으로서', '으로써', '에서는', '에게는', '까지', '부터', '에게', '에서', '으로', '처럼', '보다', '라고', '이라', '은', '는', '이', '가', '을', '를', '에', '의', '도', '와', '과', '로', '만', '야'];
const STOP = new Set(['그리고', '하지만', '그러나', '그래서', '그런데', '그는', '그녀는', '그것', '이것', '저것', '있었다', '없었다', '했다', '것이다', '것을', '것이', '하는', '있는', '없는', '그런', '이런', '저런', '정말', '조금', '아주', '너무', '다시', '이미', '그저']);

/** 서술 문장(대사 제외)을 나눈다 */
export function narrationSentences(text: string): string[] {
  const noDialogue = text.replace(DIALOGUE, '\n');
  return noDialogue
    // 뒤쪽 확인(lookbehind) 정규식은 Safari 16.4 미만에서 앱 전체를 멈추게 해서 쓰지 않는다
    .replace(/([.!?…])\s+/g, '$1\n')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !QUOTES.test(s));
}

/** 받침이 ㅆ인 글자(었·았·했·갔·렸…) = 과거형 */
function pastSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 === 20;
}

function stripJosa(w: string): string {
  for (const j of JOSA) if (w.length > j.length + 1 && w.endsWith(j)) return w.slice(0, -j.length);
  return w;
}

function top(map: Map<string, number>, n: number, min: number) {
  return [...map.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([text, count]) => ({ text, count }));
}

export function styleStats(bodies: string[]): StyleStats {
  const text = bodies.join('\n\n');
  const chars = text.replace(/\s/g, '').length;
  const dialogueChars = (text.match(DIALOGUE) ?? []).join('').replace(/\s/g, '').length;
  const sentences = bodies.flatMap(narrationSentences);
  const paragraphs = text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  const endings = new Map<string, number>();
  let past = 0;
  let present = 0;
  for (const s of sentences) {
    const core = s.replace(/[.!?…\s]+$/, '');
    if (core.length < 2) continue;
    const end = core.slice(-2);
    endings.set(end, (endings.get(end) ?? 0) + 1);
    if (!core.endsWith('다')) continue;
    if (core.length >= 2 && pastSyllable(core[core.length - 2])) past++;
    else present++;
  }
  const words = new Map<string, number>();
  const phrases = new Map<string, number>();
  for (const s of sentences) {
    const ws = s.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => {
      const base = stripJosa(w);
      if ([...base].length >= 2 && !STOP.has(w) && !STOP.has(base) && !/^\d+$/.test(base)) words.set(base, (words.get(base) ?? 0) + 1);
      if (i > 0) {
        const p = `${ws[i - 1]} ${w}`;
        if (p.length >= 5) phrases.set(p, (phrases.get(p) ?? 0) + 1);
      }
    });
  }
  const per1000 = (re: RegExp) => (chars ? Math.round(((text.match(re) ?? []).length / chars) * 10000) / 10 : 0);
  const narrChars = sentences.reduce((n, s) => n + s.replace(/\s/g, '').length, 0);
  return {
    chars,
    sentences: sentences.length,
    avgSentence: sentences.length ? Math.round(narrChars / sentences.length) : 0,
    dialogueRatio: chars ? Math.round((dialogueChars / chars) * 100) / 100 : 0,
    avgParagraph: paragraphs.length ? Math.round(paragraphs.reduce((n, p) => n + p.replace(/\s/g, '').length, 0) / paragraphs.length) : 0,
    tense: { past, present },
    endings: top(endings, 5, 2),
    words: top(words, 8, 3),
    phrases: top(phrases, 5, 3),
    marks: { ellipsis: per1000(/…|\.{3}/g), dash: per1000(/—|──/g), exclaim: per1000(/!/g), question: per1000(/\?/g) },
  };
}
