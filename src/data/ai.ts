import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { db } from './client';

/*
 * AI 함수 부르기(BUILD_SPEC 8.1). 화면은 supabase.functions.invoke만 쓰고, API 키는 서버(Edge Function)에만 있다.
 */

export type AiErrorCode = 'ai_off' | 'not_deployed' | 'limit' | 'forbidden' | 'sample' | 'not_found' | 'bad_request' | 'ai_failed' | 'login';

export class AiCallError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

export async function callAi<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().functions.invoke(name, { body });
  if (error) {
    // 함수를 아직 올리지 않았으면 404(또는 CORS 때문에 연결 실패)
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) throw new AiCallError('not_deployed');
    if (error instanceof FunctionsHttpError && (error.context as Response | undefined)?.status === 404) throw new AiCallError('not_deployed');
    throw new AiCallError('ai_failed');
  }
  const res = data as { ok?: boolean; error?: AiErrorCode } | null;
  if (!res?.ok) throw new AiCallError(res?.error ?? 'ai_failed');
  return res as T;
}

export type AiStatus = { enabled: boolean; limits: { text: number; image: number }; usage: { text: number; image: number } | null };

export type GuideResult = {
  opening_line: string;
  directions: { type: string; text: string; evidence: string | null; tag: string }[];
  reuse_reason: string | null;
};

export type DesignResult = {
  sessionId: string;
  targetEp: number;
  scenes: { no: number; text: string; uses: { item: string; evidence: string | null; tag: string }[] }[];
  draft: string | null;
  missing: string[];
};

export type ChatResult = { reply: string; evidence: { text: string | null; tag: string }[] };

export type AnalyzeResult = { summary: string; counts: { new_items: number; aliases: number; relations: number; resolutions: number } };
