/*
 * 글 AI 공급자 고르기(외부 라이브러리 없음 — 테스트와 Deno가 함께 쓴다).
 * AI_PROVIDER 비밀값(openai | claude)이 있으면 그 공급자(키가 없으면 꺼짐).
 * 없으면 OpenAI 키가 있으면 OpenAI, 아니면 Claude 키가 있으면 Claude. 둘 다 없으면 꺼짐(null).
 */
export type Provider = 'openai' | 'claude';
export type Tier = 'main' | 'fast';

export function pickProvider(o: { choice?: string | null; openaiKey: boolean; claudeKey: boolean }): Provider | null {
  const c = (o.choice ?? '').trim().toLowerCase();
  if (c === 'openai' || c === 'gpt') return o.openaiKey ? 'openai' : null;
  if (c === 'claude' || c === 'anthropic') return o.claudeKey ? 'claude' : null;
  if (o.openaiKey) return 'openai';
  if (o.claudeKey) return 'claude';
  return null;
}

/** OpenAI 모델 후보: 비밀값(OPENAI_MODEL_MAIN/FAST)이 있으면 그것 먼저, 그다음 기본값, 못 쓰면 한 세대 앞 모델 */
export function openaiModels(tier: Tier, override?: string | null): string[] {
  const base = tier === 'main' ? ['gpt-5.5', 'gpt-5'] : ['gpt-5.4-mini', 'gpt-5-mini'];
  const o = (override ?? '').trim();
  return o ? [o, ...base.filter((m) => m !== o)] : base;
}
