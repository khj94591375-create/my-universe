import { limits } from '../../config/limits';

/*
 * 장면 나누기와 문장 나누기(BUILD_SPEC 7.6).
 */

const SCENE_MARK = /^\s*(\*\s*\*\s*\*|◇|◆|#|---)\s*$/;

/** 회차 본문을 장면으로 나눈다. 구분 기호 줄 또는 빈 줄 2개 이상이 경계. 너무 긴 장면은 문단 경계에서 다시 나눈다. */
export function splitScenes(body: string): string[] {
  const text = body.replace(/\r\n?/g, '\n');
  const scenes: string[] = [];
  let cur: string[] = [];
  let blank = 0;
  const flush = () => {
    const s = cur.join('\n').trim();
    if (s) scenes.push(s);
    cur = [];
  };
  for (const line of text.split('\n')) {
    if (SCENE_MARK.test(line)) {
      flush();
      blank = 0;
      continue;
    }
    if (line.trim() === '') {
      blank += 1;
      if (blank === 2) flush(); // 빈 줄 2개 이상
      else cur.push(line);
      continue;
    }
    blank = 0;
    cur.push(line);
  }
  flush();
  return scenes.flatMap(splitLong);
}

function splitLong(scene: string): string[] {
  if (scene.length <= limits.sceneMax) return [scene];
  const paras = scene.split(/\n/).filter((p) => p.trim());
  const out: string[] = [];
  let buf = '';
  for (const p of paras) {
    if (buf && buf.length + p.length + 1 > limits.sceneMax && buf.length >= limits.sceneTarget / 2) {
      out.push(buf);
      buf = '';
    }
    buf = buf ? `${buf}\n${p}` : p;
    if (buf.length >= limits.sceneTarget) {
      out.push(buf);
      buf = '';
    }
  }
  if (buf) out.push(buf);
  return out;
}

const SENTENCE_END = /(?<=[.!?…”"」』])\s+|\n+/;

/** 문장 나누기: . ! ? … 또는 닫는 따옴표 뒤 공백·줄바꿈 기준. */
export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 근거 문장이 너무 길면 일치한 단어 주변으로 자른다. 잘라도 원고에 글자 그대로 있는 부분이다. */
export function trimEvidence(sentence: string, term: string, max: number = limits.evidenceMax): string {
  if (sentence.length <= max) return sentence;
  const at = Math.max(0, sentence.indexOf(term));
  const start = Math.max(0, Math.min(at - Math.floor((max - term.length) / 2), sentence.length - max));
  return sentence.slice(start, start + max);
}
