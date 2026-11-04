/* 맞춤법 검사 공용 타입. 결과는 브라우저에만 두고 원고와 따로 관리한다. */

export type SpellType = 'spelling' | 'spacing' | 'typo' | 'punctuation' | 'style';

/** 원고 안 한 곳에 대한 제안. start·end는 원고 전체 기준 글자 위치. */
export type Suggestion = {
  id: string;
  start: number;
  end: number;
  original: string;
  suggestion: string;
  type: SpellType;
  reason: string;
  /** sure = 확실한 오류, check = 의도적일 수 있어 작가 확인 필요 */
  certainty: 'sure' | 'check';
  inDialogue: boolean;
  /** rule = 브라우저 기본 규칙(외부 전송 없음), ai = AI 검사 */
  source: 'rule' | 'ai';
};

/** 작가의 선택: 수정 적용 / 원문 유지 / 앞으로도 이 표현 유지 */
export type Decision = 'apply' | 'keep' | 'always';

/** AI가 돌려준 제안(위치 없음) */
export type AiSpell = { original: string; suggestion: string; type: SpellType; reason: string; certainty: 'sure' | 'check'; in_dialogue: boolean };
