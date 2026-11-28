import { Suspense } from 'react';
import { Navigate, Outlet, useParams, Link } from 'react-router-dom';
import { copy } from '../config/copy';
import { LEGACY_SAMPLE_SLUG, SAMPLE_WORK_ID } from '../config/sample';
import { useSession } from '../features/auth/SessionProvider';
import { useWork } from '../features/works/useWork';
import { useWorkData } from '../features/works/workData';
import { unreviewedCount } from '../features/ai/review';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';
import { WorkTitleContext } from './workTitle';
import { BottomNav, WorkspaceBar } from './WorkspaceBar';
import s from './AppShell.module.css';

/**
 * 작품 안 화면의 공통 틀: 상단바(로고 · 작품 선택 · 다섯 메뉴 · 계정) + 종이색 작업 영역.
 * 860px 이하에서는 다섯 메뉴가 화면 아래 탐색 막대로 내려간다.
 * 볼 수 있는 작품인지는 DB(RLS)가 정한다: 예시 작품은 누구나, 그 외는 소유자만.
 */
export function AppShell() {
  const { workId = '' } = useParams();
  const { session, loading: sessionLoading } = useSession();
  const { work, loading, error } = useWork(workId);
  const { data } = useWorkData(workId);
  const pending = unreviewedCount(data);

  if (workId === LEGACY_SAMPLE_SLUG) return <Navigate to={`/w/${SAMPLE_WORK_ID}/home`} replace />;
  if (sessionLoading || loading) return <Loading fullPage />;
  // 로그인하지 않은 사람이 남의 작품 주소로 오면 시작 화면으로
  if (!work && !error && !session) return <Navigate to="/" replace />;

  const isSample = Boolean(work?.is_sample);
  return (
    <div className={s.app} data-mu-workspace="">
      <a
        href="#"
        className={s.skip}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {copy.shell.skip}
      </a>
      <WorkspaceBar work={work} pending={pending} />
      <main className={s.main} id="main" tabIndex={-1}>
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
            <WorkTitleContext.Provider value={work.title}>
              <Suspense fallback={<Loading />}>
                <Outlet />
              </Suspense>
            </WorkTitleContext.Provider>
          </>
        )}
      </main>
      {work && <BottomNav workId={work.id} pending={pending} />}
    </div>
  );
}
