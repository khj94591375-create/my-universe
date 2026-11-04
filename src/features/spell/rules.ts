import { dialogueRanges, inRanges } from './text';
import type { Suggestion, SpellType } from './types';

/*
 * 브라우저 기본 맞춤법 규칙(AI 없이, 외부 전송 없음). 확실하고 단순한 것만. [변경 가능: 목록]
 * 대사 안이면 의도적일 수 있어 "확인 필요"로 표시한다.
 */

/** 글자에 ㄹ 받침이 있는지(할·열·갈…) */
function hasRieul(ch: string): boolean {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 === 8;
}

/** ㄴ 또는 ㄹ 받침(한·할·본·갈…) */
function hasNieunOrRieul(ch: string): boolean {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 && (c % 28 === 4 || c % 28 === 8);
}

type Rule = { re: RegExp; to: (m: RegExpExecArray) => string; type: SpellType; reason: string; certainty?: 'sure' | 'check' };

// 자주 틀리는 표현(앞뒤가 한글이 아닐 때만, 어절 단위)
const WORDS: [string, string, string][] = [
  ['되요', '돼요', '"되어요"의 준말은 "돼요"예요.'],
  ['됬', '됐', '"되었"의 준말은 "됐"이에요.'],
  ['몇일', '며칠', '"며칠"이 맞는 표기예요.'],
  ['어의없', '어이없', '"어이없다"가 맞는 표기예요.'],
  ['금새', '금세', '"금시에"의 준말은 "금세"예요.'],
  ['웬지', '왠지', '"왜인지"의 준말은 "왠지"예요.'],
  ['왠만', '웬만', '"웬만하다"가 맞는 표기예요.'],
  ['오랫만', '오랜만', '"오래간만"의 준말은 "오랜만"이에요.'],
  ['역활', '역할', '"역할"이 맞는 표기예요.'],
  ['일일히', '일일이', '"일일이"가 맞는 표기예요.'],
  ['설겆이', '설거지', '"설거지"가 맞는 표기예요.'],
  ['희안', '희한', '"희한하다"가 맞는 표기예요.'],
  ['어떻해', '어떡해', '"어떻게 해"의 준말은 "어떡해"예요.'],
  ['곰곰히', '곰곰이', '"곰곰이"가 맞는 표기예요.'],
  ['깨끗히', '깨끗이', '"깨끗이"가 맞는 표기예요.'],
];

const RULES: Rule[] = [
  // 띄어쓰기: 의존 명사 "수"·"것"
  // "ㄹ 받침 + 수 + 있다/없다"(할수 있다, 열수있다 → 할 수 있다)
  { re: /([가-힣])수(\s?)(있|없)/g, to: (m) => (hasRieul(m[1]) ? `${m[1]} 수 ${m[3]}` : m[0]), type: 'spacing', reason: '"수"는 의존 명사라 앞뒤를 띄어 써요.' },
  // "ㄴ·ㄹ 받침 + 것 + 같다"(할것같다 → 할 것 같다), 그리고 "것같다" → "것 같다"
  { re: /([가-힣])것(\s?)같/g, to: (m) => (hasNieunOrRieul(m[1]) ? `${m[1]} 것 같` : m[0]), type: 'spacing', reason: '"것"은 의존 명사라 띄어 쓰고, "같다"도 띄어 써요.' },
  { re: /(\s)것같/g, to: (m) => `${m[1]}것 같`, type: 'spacing', reason: '"것 같다"는 띄어 써요.' },
  // 같은 낱말이 바로 두 번(예: "그 그") — 말 더듬기·강조일 수 있어 확인 필요
  { re: /(^|[\s"“'(])([가-힣]{1,6})\s+\2(?=[\s.,!?…"”')]|$)/g, to: (m) => `${m[1]}${m[2]}`, type: 'typo', reason: '같은 낱말이 연달아 두 번 나와요.', certainty: 'check' },
  // 공백 두 칸 이상(줄 처음 들여쓰기 제외)
  { re: /(\S)( {2,})(?=\S)/g, to: (m) => `${m[1]} `, type: 'spacing', reason: '띄어쓰기가 두 칸 이상이에요.' },
  // 문장부호 앞 띄어쓰기
  { re: /([가-힣a-zA-Z0-9])( +)([.,?!])/g, to: (m) => `${m[1]}${m[3]}`, type: 'punctuation', reason: '문장부호 앞은 띄우지 않아요.' },
  ...WORDS.map(([from, to, reason]): Rule => ({ re: new RegExp(`(^|[^가-힣])(${from})`, 'g'), to: (m) => `${m[1]}${to}`, type: 'spelling', reason })),
];

let seq = 0;

export function ruleSuggestions(text: string): Suggestion[] {
  const dialog = dialogueRanges(text);
  const out: Suggestion[] = [];
  for (const r of RULES) {
    r.re.lastIndex = 0;
    for (let m = r.re.exec(text); m; m = r.re.exec(text)) {
      const original = m[0];
      const suggestion = r.to(m);
      if (original === suggestion) continue;
      // 앞에 붙은 구분 글자(공백·따옴표)는 위치에서 뺀다
      const lead = m[1] && /^[\s"“'(]$/.test(m[1]) ? m[1].length : m[1] === '' ? 0 : 0;
      const start = m.index + lead;
      const orig = original.slice(lead);
      const sug = suggestion.slice(lead);
      const end = start + orig.length;
      const inDialogue = inRanges(dialog, start, end);
      out.push({ id: `r${++seq}`, start, end, original: orig, suggestion: sug, type: r.type, reason: r.reason, certainty: inDialogue ? 'check' : r.certainty ?? 'sure', inDialogue, source: 'rule' });
      if (r.re.lastIndex === m.index) r.re.lastIndex++;
    }
  }
  return out;
}
