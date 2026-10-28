import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { copy } from '../../config/copy';
import { SAMPLE_WORK_ID } from '../../config/sample';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signInWithGoogle } from '../../features/auth/auth';
import { useSession } from '../../features/auth/SessionProvider';
import s from './StartScreen.module.css';

/** 시작 화면(BUILD_SPEC 6.1). 로그인하면 작품 목록으로, 예시 작품은 로그인 없이 둘러본다. */
export default function StartScreen() {
  const nav = useNavigate();
  const { session, loading, loginError } = useSession();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 구글 로그인에서 돌아오면(또는 이미 로그인돼 있으면) 바로 작품 목록으로
  if (session) return <Navigate to="/works" replace />;

  const login = async () => {
    setError(null);
    setRedirecting(true);
    try {
      await signInWithGoogle(); // 성공하면 구글 화면으로 이동한다
    } catch {
      setRedirecting(false);
      setError(copy.start.loginError);
    }
  };

  const message = !isSupabaseConfigured ? copy.start.notConfigured : error ?? (loginError ? copy.start.loginError : copy.start.loginHint);

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="My Universe 로고" className={s.logo} />
        <p className={s.lead}>{copy.start.lead}</p>
        <h1 className={s.name}>{copy.brand.name}</h1>
        <p className={s.message}>{copy.brand.message}</p>
        <div className={s.actions}>
          <Button
            variant="accent"
            size="lg"
            onClick={login}
            disabled={!isSupabaseConfigured || loading || redirecting}
          >
            {redirecting ? copy.start.loggingIn : copy.start.login}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => nav(`/w/${SAMPLE_WORK_ID}/home`)}>
            {copy.start.sample}
          </Button>
        </div>
        <p className={s.note} role={error || loginError ? 'alert' : undefined}>
          {message}
        </p>
      </section>
      <section className={s.values}>
        {copy.start.values.map((v) => (
          <div key={v.title} className={s.value}>
            <h2>{v.title}</h2>
            <p>{v.body}</p>
          </div>
        ))}
      </section>
      <p className={s.notice}>{copy.start.aiNotice}</p>
    </div>
  );
}
