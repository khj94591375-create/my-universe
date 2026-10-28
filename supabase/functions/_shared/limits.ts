/*
 * 하루 사용량 제한(BUILD_SPEC 8.1, 9장). 확인은 호출 전, +1은 성공했을 때만.
 */
import type { SupabaseClient } from './deps.ts';
import { HttpError } from './http.ts';

export function dailyLimits() {
  return {
    text: Number(Deno.env.get('DAILY_AI_TEXT_LIMIT') ?? 50),
    image: Number(Deno.env.get('DAILY_IMAGE_LIMIT') ?? 8),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

export async function usageToday(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('ai_usage').select('text_calls, image_calls').eq('user_id', userId).eq('day', today()).maybeSingle();
  return { text: (data?.text_calls as number) ?? 0, image: (data?.image_calls as number) ?? 0 };
}

export async function checkLimit(admin: SupabaseClient, userId: string, kind: 'text' | 'image') {
  const used = await usageToday(admin, userId);
  if (used[kind] >= dailyLimits()[kind]) throw new HttpError('limit', '오늘 사용량을 다 썼어요.');
}

export async function addUsage(admin: SupabaseClient, userId: string, kind: 'text' | 'image') {
  const { error } = await admin.rpc('increment_ai_usage', { uid: userId, kind });
  if (error) console.error('usage update failed:', error.message);
}
