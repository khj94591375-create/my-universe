import { NavLink, Navigate, Outlet, useParams, Link } from 'react-router-dom';
import { workNav } from '../config/nav';
import { copy } from '../config/copy';
import { LEGACY_SAMPLE_SLUG, SAMPLE_WORK_ID } from '../config/sample';
import { useSession } from '../features/auth/SessionProvider';
import { useWork } from '../features/works/useWork';
import { BrandMark } from './BrandMark';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';
import s from './AppShell.module.css';

/**
 * 작품 안 화면의 공통 틀: 왼쪽 남색 메뉴 + 오른쪽 종이색 작업 영역. 860px 이하에서 메뉴는 위쪽 띠로 접힌다.
 * 볼 수 있는 작품인지는 DB(RLS)가 정한다: 예시 작품은 누구나, 그 외는 소유자만.
 */
export function AppShell() {
  const { workId = '' } = useParams();
  const { session, loading: sessionLoading } = useSession();
  const { work, loading, error } = useWork(workId);

  if (workId === LEGACY_SAMPLE_SLUG) return <Navigate to={`/w/${SAMPLE_WORK_ID}/home`} replace />;
  if (sessionLoading || loading) return <Loading fullPage />;
  // 로그인하지 않은 사람이 남의 작품 주소로 오면 시작 화면으로
  if (!work && !error && !session) return <Navigate to="/" replace />;

  const isSample = Boolean(work?.is_sample);
  return (
    <div className={s.app}>
      <aside className={s.side}>
        <Link to={session ? '/works' : '/'} className={s.brand} aria-label={session ? copy.common.back : copy.common.toStart}>
          <BrandMark />
          <b>{copy.brand.name}</b>
        </Link>
        {work && (
          <div className={s.work}>
            {copy.shell.current}
            <strong>{work.title}</strong>
            {isSample && <span>{copy.works.sampleLabel}</span>}
          </div>
        )}
        <nav className={s.nav} aria-label="작품 메뉴">
          {workNav.map((n) => (
            <NavLink key={n.path} to={`/w/${workId}/${n.path}`} className={({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)}>
              <i aria-hidden="true">{n.icon}</i>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={s.foot}>
          <span>{copy.brand.principle}</span>
          {session ? <Link to="/settings">{copy.settings.title}</Link> : <Link to="/">{copy.start.login}</Link>}
        </div>
      </aside>
      <main className={s.main}>
        {error ? (
          <ErrorState body={error} onRetry={() => window.location.reload()} />
        ) : !work ? (
          <ErrorState
            title={copy.shell.notFoundTitle}
            body={copy.shell.notFoundBody}
            action={<Link to={session ? '/works' : '/'}>{session ? copy.common.back : copy.common.toStart}</Link>}
          />
        ) : (
          <>
            {isSample && (
              <div className={s.sampleBar}>
                {copy.works.sampleLabel}
                {!session && <span className={s.sampleHint}> · {copy.shell.loginToWrite}</span>}
              </div>
            )}
            <Outlet />
          </>
        )}
      </main>
    </div>
  );
}
