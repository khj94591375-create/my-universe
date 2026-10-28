import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Loading } from '../../components/Loading';
import { BrandMark } from '../../components/BrandMark';
import { copy } from '../../config/copy';
import { getSampleWork, listMyWorks } from '../../data/works';
import { toMessage } from '../../data/errors';
import type { WorkWithStats } from '../../data/types';
import { useSession } from '../../features/auth/SessionProvider';
import { NewWorkForm } from './NewWorkForm';
import { WorkCard } from './WorkCard';
import s from './WorksScreen.module.css';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; mine: WorkWithStats[]; sample: WorkWithStats | null };

/** 작품 목록(BUILD_SPEC 6.2). 로그인한 사람만 들어온다(RequireAuth). */
export default function WorksScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [creating, setCreating] = useState(false);

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
    <div className={s.page}>
      <header className={s.bar}>
        <Link to="/works" className={s.brand}>
          <BrandMark size={28} />
          <b>{copy.brand.name}</b>
        </Link>
        <Link to="/settings" className={s.settings}>
          {copy.settings.title}
        </Link>
      </header>
      <main className={s.main}>
        <div className={s.head}>
          <h1>{copy.works.title}</h1>
          {!creating && <Button onClick={() => setCreating(true)}>{copy.works.newWork}</Button>}
        </div>
        {creating && (
          <NewWorkForm
            onCancel={() => setCreating(false)}
            onCreated={(work) => {
              setCreating(false);
              updateMine((mine) => [{ ...work, episode_count: 0, open_foreshadow_count: 0, last_upload_at: null }, ...mine]);
            }}
          />
        )}

        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <ErrorState title={copy.works.loadError} body={state.message} onRetry={load} />}
        {state.status === 'ready' && (
          <>
            {state.mine.length === 0 && !creating ? (
              <EmptyState
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
            <h2 className={s.sub}>{copy.works.sampleSection}</h2>
            {state.sample ? <WorkCard work={state.sample} /> : <p className={s.meta}>{copy.works.sampleMissing}</p>}
          </>
        )}
      </main>
    </div>
  );
}
