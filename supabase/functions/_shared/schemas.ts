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

export const consistencySchema = z.object({
  issues: z.array(
    z.object({
      item_name: z.string(),
      description: z.string().describe('무엇이 어떻게 어긋나는지 한 문장'),
      a: z.object({ evidence: z.string(), tag: z.string() }),
      b: z.object({ evidence: z.string(), tag: z.string() }),
    }),
  ),
});

/** 맞춤법 검사(작가가 고를 제안만, 원고는 고치지 않음) */
export const spellSchema = z.object({
  suggestions: z.array(
    z.object({
      original: z.string().describe('원고에 있는 틀린 부분을 글자 그대로(띄어쓰기 포함). 짧게, 고칠 단어·어절 주변만'),
      suggestion: z.string().describe('바르게 고친 같은 부분'),
      type: z.enum(['spelling', 'spacing', 'typo', 'punctuation', 'style']).describe('spelling 맞춤법, spacing 띄어쓰기, typo 오탈자, punctuation 문장부호, style 문체 제안(오류 아님)'),
      reason: z.string().describe('왜 고치는지 한 문장'),
      certainty: z.enum(['sure', 'check']).describe('확실한 오류면 sure, 의도적일 수 있거나 애매하면 check'),
      in_dialogue: z.boolean().describe('큰따옴표 대사 안이면 true'),
    }),
  ),
});

/** 회차 요약 초안(저장하지 않음, 작가가 고쳐서 저장) */
export const summarySchema = z.object({
  summary: z.string().describe('이 회차 요약 2~3문장. 원고에 있는 사건만, 평가·추측 없이'),
});

/** 세계관 질문하기(저장하지 않음) */
export const askSchema = z.object({
  found: z.boolean().describe('주어진 원고 장면·설정집에서 답을 찾았으면 true, 찾지 못했으면 false'),
  answer: z.string().describe('2~5문장 답. 찾지 못했으면 무엇이 확인되지 않는지 짧게'),
  evidence: z.array(z.object({ text: z.string(), tag: z.string() })).describe('답의 근거가 된 원고 문장(글자 그대로)과 장면 꼬리표'),
});

const profileField = z.object({
  text: z.string().describe('1~2문장. 원고에서 확인되지 않으면 빈 문자열'),
  evidence: z.array(z.object({ text: z.string(), tag: z.string() })).describe('원고 문장 그대로와 장면 꼬리표, 최대 3개'),
});
/** 인물 소개 카드(저장하지 않음, 작가가 고쳐서 설정집에 넣음) */
export const profileSchema = z.object({
  look: profileField.describe('외모: 생김새·옷차림·눈에 띄는 특징'),
  personality: profileField.describe('성격: 행동으로 드러난 성향'),
  speech: profileField.describe('말투: 말버릇·어조·호칭(대사 예시는 evidence로)'),
});

/** 막힌 장면 대안 전개(저장하지 않음, 플롯 수준만) */
export const unstickSchema = z.object({
  options: z
    .array(
      z.object({
        title: z.string().describe('대안 이름 한 줄(예: "노인이 먼저 정체를 밝힌다")'),
        plan: z.string().describe('이 장면을 어떻게 풀지 2~3문장. 본문 문장이 아니라 전개 설명'),
        uses: z.array(z.object({ item: z.string().describe('설정집 이름 그대로'), evidence: z.string(), tag: z.string() })),
        caution: z.string().describe('이 대안을 쓰면 앞 설정과 부딪히거나 챙겨야 할 점 한 줄. 없으면 빈 문자열'),
      }),
    )
    .describe('서로 방향이 다른 대안 3개'),
});

/** 문체 분석(저장하지 않음, 평가 없이 특징만) */
export const styleSchema = z.object({
  traits: z
    .array(
      z.object({
        name: z.string().describe('특징 이름 짧게(예: "짧은 문장으로 긴장을 끊는다")'),
        description: z.string().describe('1~2문장 설명. 좋다/나쁘다 평가 없이'),
        examples: z.array(z.string()).describe('원고 문장 그대로 1~2개'),
      }),
    )
    .describe('이 작가 문체의 두드러진 특징 3~5개'),
});
