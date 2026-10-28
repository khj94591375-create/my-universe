import type { ReactNode } from 'react';
import { ErrorState } from '../../components/ErrorState';
import { Loading } from '../../components/Loading';
import { useWorkData, type WorkData } from '../../features/works/workData';

/** 작품 데이터를 불러오는 동안 Loading, 실패하면 ErrorState, 준비되면 children(data). */
export function WorkDataGate({ workId, children }: { workId: string; children: (data: WorkData) => ReactNode }) {
  const { data, loading, error, reload } = useWorkData(workId);
  if (loading) return <Loading />;
  if (error && !data) return <ErrorState body={error} onRetry={reload} />;
  if (!data) return null;
  return <>{children(data)}</>;
}
