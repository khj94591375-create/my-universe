import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkspaceBar } from '../../components/WorkspaceBar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Loading } from '../../components/Loading';
import { copy } from '../../config/copy';
import { art } from '../../config/art';
import { usePageTitle } from '../../lib/usePageTitle';
import { getSampleWork, listMyWorks } from '../../data/works';
import { toMessage } from '../../data/errors';
import type { WorkWithStats } from '../../data/types';
import { useSession } from '../../features/auth/SessionProvider';
import { NewWorkForm } from './NewWorkForm';
import { SampleRow, WorkCard } from './WorkCard';
import s from './WorksScreen.module.css';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; mine: WorkWithStats[]; sample: WorkWithStats | null };

/** 작품 목록(BUILD_SPEC 6.2). 로그인한 사람만 들어온다(RequireAuth). */
export default function WorksScreen() {
  usePageTitle(copy.works.title);
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('new') === '1');
  const nav = useNavigate();
  const closeNew = useCallback(() => setCreating(false), []);
  // 가이드의 "새 작품 만들기"로 오면 폼을 연다
  useEffect(() => {
    if (params.get('new') === '1') {
      setCreating(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [mine, sample] = await Promise.all([listMyWorks(userId), getSampleWork()]);
      setState({ status: 'ready', mine, sample });
    } catch (e) {
      setState({ status: 'error', message: toMessage(e) });
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateMine = (fn: (mine: WorkWithStats[]) => WorkWithStats[]) =>
    setState((st) => (st.status === 'ready' ? { ...st, mine: fn(st.mine) } : st));

  return (
    <div className={s.page} data-mu-workspace="">
      <WorkspaceBar />
      <main className={s.main}>
        <div className={s.head}>
          <h1>{copy.works.title}</h1>
          <Button onClick={() => setCreating(true)}>+ {copy.works.newWork}</Button>
        </div>
        {creating && (
          <NewWorkForm
            onCancel={closeNew}
            onCreated={(work) => {
              setCreating(false);
              // 만든 작품의 빈 작업실로 바로(첫 원고 올리기로 이어진다)
              nav(`/w/${work.id}/home`);
            }}
          />
        )}

        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <ErrorState title={copy.works.loadError} body={state.message} onRetry={load} />}
        {state.status === 'ready' && (
          <>
            {state.mine.length === 0 ? (
              <EmptyState
                art={art.emptyCollection}
                title={copy.works.emptyTitle}
                body={copy.works.emptyBody}
                action={<Button variant="accent" onClick={() => setCreating(true)}>{copy.works.newWork}</Button>}
              />
            ) : (
              <div className={s.grid}>
                {state.mine.map((w) => (
                  <WorkCard
                    key={w.id}
                    work={w}
                    onChanged={(title) => updateMine((mine) => mine.map((m) => (m.id === w.id ? { ...m, title } : m)))}
                    onDeleted={() => updateMine((mine) => mine.filter((m) => m.id !== w.id))}
                  />
                ))}
              </div>
            )}
            <section className={s.sampleSection} aria-labelledby="sample-head">
              <h2 id="sample-head" className={s.sub}>
                {copy.works.sampleSection}
              </h2>
              {state.sample ? <SampleRow work={state.sample} /> : <p className={s.meta}>{copy.works.sampleMissing}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
