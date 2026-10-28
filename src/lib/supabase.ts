import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Supabase 클라이언트. 공개용 publishable key만 쓴다.
 * 구글 로그인은 PKCE 방식(BUILD_SPEC 3.1). 실제 로그인 연결은 M1.
 */
export const supabase =
  url && key
    ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
    : null;

export const isSupabaseConfigured = Boolean(supabase);
