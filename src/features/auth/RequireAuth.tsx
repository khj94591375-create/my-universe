import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '../../components/Loading';
import { useSession } from './SessionProvider';

/** 로그인이 필요한 화면을 감싼다. 로그인하지 않았으면 시작 화면으로 보낸다. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <Loading fullPage />;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
