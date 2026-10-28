/*
 * 함수별 AI 출력 형식(BUILD_SPEC 8.4~8.7). 구조화 출력으로 이 형식만 받는다.
 */
import { z } from './deps.ts';

const kind = z.enum(['character', 'setting', 'foreshadow']);

export const analysisSchema = z.object({
  summary: z.string().describe('이 회차 요약 2~3문장'),
  new_items: z.array(
    z.object({
      kind,
      name: z.string(),
      note: z.string().describe('한 줄 설명'),
      look: z.string().describe('외모·모습. 원고에 없으면 빈 문자열'),
      evidence: z.string().describe('원고 장면의 문장을 글자 그대로'),
      tag: z.string().describe('근거 장면 꼬리표. 예: E7-S2'),
      confidence: z.number().describe('0~1'),
    }),
  ),
  aliases: z.array(z.object({ item_name: z.string(), alias: z.string(), evidence: z.string(), tag: z.string() })),
  relations: z.array(z.object({ a: z.string(), b: z.string(), label: z.string(), evidence: z.string(), tag: z.string() })),
  resolutions: z.array(z.object({ item_name: z.string(), evidence: z.string(), tag: z.string() })),
});

export const guideSchema = z.object({
  opening_line: z.string().describe('다음 회차 시작 문장 예시 1개'),
  directions: z.array(
    z.object({
      type: z.string().describe('회수·반전·암시 / 재등장·관계 변화·비밀 / 규칙 활용·규칙 위기·대가 중 하나'),
      text: z.string().describe('2문장 이내 제안'),
      evidence: z.string(),
      tag: z.string(),
    }),
  ),
  reuse_reason: z.string().describe('회수된 복선이면 다시 쓸 만한 이유 한 줄, 아니면 빈 문자열'),
});

export const designSchema = z.object({
  scenes: z.array(
    z.object({
      no: z.number(),
      text: z.string().describe('장면 설계 1~2문장'),
      uses: z.array(z.object({ item: z.string(), evidence: z.string(), tag: z.string() })),
    }),
  ),
  draft: z.string().describe('본문 초안 300자 이내. 요청이 없으면 빈 문자열'),
});

export const chatSchema = z.object({
  reply: z.string(),
  evidence: z.array(z.object({ text: z.string(), tag: z.string() })),
});
