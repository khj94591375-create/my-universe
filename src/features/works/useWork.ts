import { useEffect, useState } from 'react';
import { getWork } from '../../data/works';
import type { Work } from '../../data/types';
import { useSession } from '../auth/SessionProvider';

type WorkState = { work: Work | null; loading: boolean; error: string | null };

// 같은 작품을 여러 섹션이 동시에 불러도 요청은 한 번만 보낸다. 로그인 사용자가 바뀌면 비운다.
const cache = new Map<string, Promise<Work | null>>();
let cacheUser: string | null | undefined;

function loadWork(id: string, userId: string | null) {
  if (cacheUser !== userId) {
    cache.clear();
    cacheUser = userId;
  }
  let p = cache.get(id);
  if (!p) {
    p = getWork(id);
    cache.set(id, p);
    p.catch(() => cache.delete(id));
  }
  return p;
}

/** 이름을 바꾸거나 지운 뒤 다시 불러오게 한다. */
export function forgetWork(id: string) {
  cache.delete(id);
}

/** 작품 하나를 불러온다. 섹션·틀 어디서든 workId만 있으면 쓸 수 있다. */
export function useWork(workId: string): WorkState {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user.id ?? null;
  const [state, setState] = useState<WorkState>({ work: null, loading: true, error: null });

  useEffect(() => {
    if (sessionLoading) return;
    let alive = true;
    setState({ work: null, loading: true, error: null });
    loadWork(workId, userId).then(
      (work) => alive && setState({ work, loading: false, error: null }),
      (e: unknown) => alive && setState({ work: null, loading: false, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [workId, userId, sessionLoading]);

  return state;
}

/** 이 작품에 쓸 수 있는가: 로그인했고 내 작품일 때만. 예시 작품은 누구도 쓸 수 없다. */
export function useCanWrite(work: Work | null): boolean {
  const { session } = useSession();
  return Boolean(work && session && !work.is_sample && work.owner_id === session.user.id);
}
