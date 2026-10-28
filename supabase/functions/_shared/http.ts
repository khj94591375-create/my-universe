/*
 * 모든 함수의 공통 틀(BUILD_SPEC 8.1): CORS, 로그인 확인, 작품 소유자 확인, 오류 응답.
 * 응답은 항상 200 + { ok: true, ... } 또는 { ok: false, error, message } (화면에서 다루기 쉽게).
 */
import { createClient, type SupabaseClient } from './deps.ts';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type ErrorCode = 'ai_off' | 'limit' | 'forbidden' | 'sample' | 'not_found' | 'bad_request' | 'ai_failed' | 'login';

export class HttpError extends Error {
  constructor(public code: ErrorCode, message: string = code) {
    super(message);
  }
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** 서버 전용 키: 예전 이름(SUPABASE_SERVICE_ROLE_KEY) 또는 새 비밀 키 목록(SUPABASE_SECRET_KEYS, JSON)에서 꺼낸다. */
function serverKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

export type Ctx = { admin: SupabaseClient; userId: string | null; body: Record<string, unknown> };

/** Deno.serve에 넘길 처리기. 로그를 남길 때 원고 원문은 절대 찍지 않는다(8.1). */
export function serve(handler: (ctx: Ctx) => Promise<Record<string, unknown>>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      let userId: string | null = null;
      if (jwt) {
        const { data } = await admin.auth.getUser(jwt);
        userId = data.user?.id ?? null;
      }
      const body = req.headers.get('content-type')?.includes('json') ? await req.json().catch(() => ({})) : {};
      return json({ ok: true, ...(await handler({ admin, userId, body })) });
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, error: e.code, message: e.message });
      console.error('function error:', e instanceof Error ? e.name + ': ' + e.message.slice(0, 200) : 'unknown');
      return json({ ok: false, error: 'ai_failed', message: 'internal' });
    }
  });
}

export function requireUser(ctx: Ctx): string {
  if (!ctx.userId) throw new HttpError('login', '로그인이 필요해요.');
  return ctx.userId;
}

export function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== 'string' || !v) throw new HttpError('bad_request', `${key} 없음`);
  return v;
}

/** 작품 소유자인지 확인. 예시 작품은 누구도 AI를 쓸 수 없다(시연용 미리 생성 결과는 [미정]). */
export async function requireOwnWork(admin: SupabaseClient, userId: string, workId: string) {
  const { data: work } = await admin.from('works').select('id, owner_id, is_sample, title').eq('id', workId).maybeSingle();
  if (!work) throw new HttpError('not_found', '작품을 찾을 수 없어요.');
  if (work.is_sample) throw new HttpError('sample', '예시 작품에서는 AI를 쓸 수 없어요.');
  if (work.owner_id !== userId) throw new HttpError('forbidden', '내 작품이 아니에요.');
  return work as { id: string; owner_id: string; is_sample: boolean; title: string };
}
