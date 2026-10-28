import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { takeLoginErrorFromUrl } from './auth';
import { clearWorkData } from '../works/workData';

type SessionState = {
  session: Session | null;
  /** 처음 세션을 확인하는 중(로그인 직후 ?code 교환 포함) */
  loading: boolean;
  loginError: string | null;
};

const SessionContext = createContext<SessionState>({ session: null, loading: true, loginError: null });

/** 로그인 상태를 앱 전체에 알려 준다. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: Boolean(supabase),
    loginError: null,
  });

  useEffect(() => {
    const loginError = takeLoginErrorFromUrl();
    if (loginError) setState((s) => ({ ...s, loginError }));
    if (!supabase) return;
    let alive = true;
    // getSession은 supabase-js가 주소의 ?code를 세션으로 바꾸는 작업이 끝날 때까지 기다린다.
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setState((s) => ({ ...s, session: data.session, loading: false }));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // 다른 계정으로 바뀌면 이전 계정의 작품 데이터를 비운다
      setState((s) => {
        if (s.session?.user.id !== session?.user.id) clearWorkData();
        return alive ? { ...s, session, loading: false } : s;
      });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
