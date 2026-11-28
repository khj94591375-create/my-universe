import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ThemedArtImage } from '../../components/ArtImage';
import { StarShape } from '../../components/StarShape';
import { ThemeToggle } from '../../components/ThemeToggle';
import { FeatureCarousel } from './FeatureCarousel';
import { art } from '../../config/art';
import { copy } from '../../config/copy';
import { usePageTitle } from '../../lib/usePageTitle';
import { SAMPLE_WORK_ID } from '../../config/sample';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signInWithGoogle } from '../../features/auth/auth';
import { useSession } from '../../features/auth/SessionProvider';
import s from './StartScreen.module.css';

/**
 * 시작 화면(BUILD_SPEC 6.1). 첫 장: 책·등불 그림을 흐리게 깐 배경 + 제목 한 줄 + 알약 줄(예시 작품 보기 | 구글로 시작하기).
 * 그 아래 기능 소개 넘기기, 맨 아래 AI 전송 안내·개인정보 처리방침. 로그인하면 작품 목록으로.
 */
export default function StartScreen() {
  usePageTitle(copy.start.lead);
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

  // 오류·설정 없음은 늘 보이게, 평소 안내(loginHint)는 버튼에 마우스를 올리면 말풍선으로(휴대폰은 버튼 아래에 그대로)
  const problem = !isSupabaseConfigured ? copy.start.notConfigured : error ?? (loginError ? copy.start.loginError : null);
  const loginDisabled = !isSupabaseConfigured || loading || redirecting;
  const loginText = redirecting ? copy.start.loggingIn : copy.start.login;

  return (
    <main className={s.page}>
      <section className={s.hero}>
        <div className={s.heroBg} aria-hidden="true">
          <ThemedArtImage art={art.hero} eager />
        </div>
        <header className={s.top}>
          <span className={s.brand}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className={s.logo} />
            {copy.brand.name}
          </span>
          <ThemeToggle />
        </header>
        <div className={s.center}>
          <h1 className={s.title}>{copy.start.title}</h1>
          <p className={s.lead}>{copy.start.lead}</p>
          <div className={s.pill}>
            <button type="button" className={s.sample} onClick={() => nav(`/w/${SAMPLE_WORK_ID}/home`)}>
              <StarShape kind="foreshadow" size={16} />
              <span>{copy.start.sampleLong}</span>
            </button>
            <span className={s.loginWrap}>
              <Button variant="accent" size="lg" className={s.login} onClick={login} disabled={loginDisabled} aria-describedby="login-hint">
                {loginText}
              </Button>
              <span id="login-hint" role="tooltip" className={problem ? `${s.tip} ${s.tipOff}` : s.tip}>
                {copy.start.loginHint}
              </span>
            </span>
          </div>
          {problem ? (
            <p className={s.note} role={error || loginError ? 'alert' : undefined}>
              {problem}
            </p>
          ) : (
            <p className={`${s.note} ${s.touchOnly}`} aria-hidden="true">
              {copy.start.loginHint}
            </p>
          )}
        </div>
      </section>

      <section className={s.slides} aria-labelledby="start-slides">
        <h2 id="start-slides" className={s.slidesTitle}>
          {copy.start.slidesTitle}
        </h2>
        <FeatureCarousel />
        <Button variant="ghost" size="lg" className={s.again} onClick={login} disabled={loginDisabled}>
          {loginText}
        </Button>
      </section>

      <footer className={s.footer}>
        <p>{copy.start.aiNotice}</p>
        <Link to="/privacy">{copy.privacy.link}</Link>
      </footer>
    </main>
  );
}
