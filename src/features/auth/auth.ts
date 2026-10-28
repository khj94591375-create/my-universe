import { supabase } from '../../lib/supabase';

/**
 * 로그인 후 돌아올 주소. 배포: https://khj94591375-create.github.io/my-universe/
 * 로컬: http://localhost:5173/my-universe/ — 둘 다 Supabase의 Redirect URLs에 등록돼 있어야 한다.
 * 해시(#/...)는 붙이지 않는다. Supabase가 ?code=를 붙여 돌려보내면 supabase-js가 세션으로 바꾸고 주소에서 지운다.
 */
export function loginRedirectUrl() {
  return window.location.origin + import.meta.env.BASE_URL;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase 환경 변수가 없어요.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: loginRedirectUrl() },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 로그인에 실패하면 Supabase가 ?error=...&error_description=... 를 붙여 돌려보낸다.
 * 그 내용을 꺼내고 주소에서 지운다(해시 경로는 그대로 둔다).
 */
export function takeLoginErrorFromUrl(): string | null {
  const url = new URL(window.location.href);
  const message = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (!message) return null;
  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url.toString());
  return message;
}
