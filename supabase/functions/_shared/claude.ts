/*
 * Claude 호출(BUILD_SPEC 8.1). 공식 SDK + 구조화 출력(JSON 스키마)으로 JSON만 받는다.
 * 키가 없으면 AI 꺼짐. 실패하면 1회 다시 시도, 그래도 실패하면 오류.
 */
import { Anthropic, betaZodOutputFormat, type z } from './deps.ts';
import { HttpError } from './http.ts';

export function aiEnabled() {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

/** main: 가이드·설계·대화, fast: 원고 정리·충돌 감지(BUILD_SPEC 3.2, 8.1) */
export function modelFor(tier: 'main' | 'fast') {
  return tier === 'main' ? (Deno.env.get('CLAUDE_MODEL_MAIN') ?? 'claude-sonnet-5-5') : (Deno.env.get('CLAUDE_MODEL_FAST') ?? 'claude-haiku-5-5');
}

export async function askJson<T extends z.ZodType>(opts: { tier: 'main' | 'fast'; system: string; user: string; schema: T }): Promise<z.infer<T>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new HttpError('ai_off', 'AI 키가 아직 없어요.');
  // 함수는 60초 안에 끝나야 한다: 한 번 요청은 50초까지, 다시 시도는 남은 시간이 있을 때만
  const started = Date.now();
  const client = new Anthropic({ apiKey, timeout: 50_000, maxRetries: 0 });
  let last = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && Date.now() - started > 20_000) break;
    try {
      const res = await client.beta.messages.parse({
        model: modelFor(opts.tier),
        max_tokens: 16000,
        // 안전 분류기가 거절하면 서버가 알맞은 모델로 다시 시도한다(지원하지 않는 모델은 그대로 진행)
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        output_config: { format: betaZodOutputFormat(opts.schema) },
      });
      if (res.stop_reason === 'refusal') throw new HttpError('ai_failed', 'refusal');
      if (res.parsed_output != null) return res.parsed_output as z.infer<T>;
      last = `no parsed output (${res.stop_reason})`;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (e instanceof Anthropic.AuthenticationError) throw new HttpError('ai_off', 'AI 키가 맞지 않아요.');
      if (e instanceof Anthropic.BadRequestError) throw new HttpError('ai_failed', 'bad request');
      last = e instanceof Anthropic.APIError ? `api ${e.status}` : e instanceof Error ? e.name : 'unknown';
    }
  }
  console.error('claude failed:', last);
  throw new HttpError('ai_failed', 'AI가 응답하지 않아요.');
}
