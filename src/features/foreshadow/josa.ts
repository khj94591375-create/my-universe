/*
 * 한국어 조사 고르기: 앞 글자의 받침 여부로 을/를, 이/가, 은/는, 으로/로를 고른다(BUILD_SPEC 7.8).
 */

type Pair = '을/를' | '이/가' | '은/는' | '으로/로' | '과/와' | '아/야';

function lastHangul(word: string): number | null {
  const ch = word.trim().replace(/[\s」』"'”)\]]+$/, '').slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? code : null;
}

/** 단어 뒤에 맞는 조사를 붙인다. 한글이 아니면 "을(를)"처럼 둘 다 쓴다. */
export function josa(word: string, pair: Pair): string {
  const [withB, withoutB] = pair.split('/');
  const code = lastHangul(word);
  if (code == null) return `${word}${withB}(${withoutB})`;
  const jong = code % 28;
  if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? withoutB : withB); // ㄹ 받침은 '로'
  return word + (jong === 0 ? withoutB : withB);
}
