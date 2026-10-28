import { supabase } from '../lib/supabase';

/** Supabase 클라이언트를 꺼낸다. 환경 변수가 없으면 화면에서 오류 상태로 보이도록 예외를 던진다. */
export function db() {
  if (!supabase) throw new Error('Supabase 환경 변수가 없어요(.env 확인).');
  return supabase;
}
