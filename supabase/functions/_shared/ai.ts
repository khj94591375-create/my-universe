/*
 * 글 AI 호출(BUILD_SPEC 8.1). 공급자는 OpenAI(GPT) 또는 Claude. 공식 SDK + 구조화 출력(JSON 스키마)으로 JSON만 받는다.
 * 고르는 규칙은 pickProvider(_shared/provider.ts). 키가 없으면 AI 꺼짐. 실패하면 1회 다시 시도, 그래도 실패하면 오류.
 * 함수는 60초 안에 끝나야 한다: 한 번 요청은 50초까지, 다시 시도는 남은 시간이 있을 때만.
 */
import { Anthropic, betaZodOutputFormat, OpenAI, zodTextFormat, type z } from './deps.ts';
import { HttpError } from './http.ts';
import { openaiModels, pickProvider, type Tier } from './provider.ts';

type Ask<T extends z.ZodType> = { tier: Tier; system: string; user: string; schema: T };

const env = (k: string) => Deno.env.get(k);
function provider() {
  return pickProvider({ choice: env('AI_PROVIDER'), openaiKey: Boolean(env('OPENAI_API_KEY')), claudeKey: Boolean(env('ANTHROPIC_API_KEY')) });
}

export function aiEnabled() {
  return provider() != null;
}

/** main: 가이드·설계·대화, fast: 원고 정리·충돌 감지(BUILD_SPEC 3.2, 8.1) */
export function modelFor(tier: Tier) {
  return tier === 'main' ? (env('CLAUDE_MODEL_MAIN') ?? 'claude-sonnet-5-5') : (env('CLAUDE_MODEL_FAST') ?? 'claude-haiku-5-5');
}

export function askJson<T extends z.ZodType>(opts: Ask<T>): Promise<z.infer<T>> {
  const p = provider();
  if (p === 'openai') return askOpenAI(opts);
  if (p === 'claude') return askClaude(opts);
  throw new HttpError('ai_off', 'AI 키가 아직 없어요.');
}

/** OpenAI Responses API + zod 구조화 출력. 모델을 못 쓰면(없음·권한 없음) 다음 후보로 */
async function askOpenAI<T extends z.ZodType>(opts: Ask<T>): Promise<z.infer<T>> {
  const apiKey = env('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError('ai_off', 'AI 키가 아직 없어요.');
  const started = Date.now();
  const client = new OpenAI({ apiKey, timeout: 50_000, maxRetries: 0 });
  const models = openaiModels(opts.tier, env(opts.tier === 'main' ? 'OPENAI_MODEL_MAIN' : 'OPENAI_MODEL_FAST'));
  let last = 'unknown';
  let m = 0;
  for (let attempt = 0; attempt < 2 && m < models.length; attempt++) {
    if (attempt > 0 && Date.now() - started > 20_000) break;
    try {
      const res = await client.responses.parse({
        model: models[m],
        instructions: opts.system,
        input: opts.user,
        // 생각은 짧게(60초 안에 끝나게)
        reasoning: { effort: 'low' },
        text: { format: zodTextFormat(opts.schema, 'result') },
      });
      if (res.output_parsed != null) return res.output_parsed as z.infer<T>;
      last = `no parsed output (${res.status}${res.incomplete_details?.reason ? `: ${res.incomplete_details.reason}` : ''})`;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (e instanceof OpenAI.AuthenticationError) throw new HttpError('ai_off', 'AI 키가 맞지 않아요.');
      // 이 계정에서 못 쓰는 모델이면 다음 후보로(시도 횟수는 세지 않음)
      if (e instanceof OpenAI.NotFoundError || e instanceof OpenAI.PermissionDeniedError || (e instanceof OpenAI.BadRequestError && /model/i.test(e.message))) {
        last = `model ${models[m]}: ${e.status}`;
        m++;
        attempt--;
        continue;
      }
      if (e instanceof OpenAI.BadRequestError) throw new HttpError('ai_failed', 'bad request');
      last = e instanceof OpenAI.APIError ? `api ${e.status}` : e instanceof Error ? e.name : 'unknown';
    }
  }
  console.error('openai failed:', last);
  throw new HttpError('ai_failed', 'AI가 응답하지 않아요.');
}

async function askClaude<T extends z.ZodType>(opts: Ask<T>): Promise<z.infer<T>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new HttpError('ai_off', 'AI 키가 아직 없어요.');
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
