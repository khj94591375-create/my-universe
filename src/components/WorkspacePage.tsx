import type { ReactNode } from 'react';
import { WorkspaceBar } from './WorkspaceBar';

/** 작품 밖의 로그인 뒤 화면(설정·채점 도구): 같은 상단바 + 작업 공간 색 */
export function WorkspacePage({ children }: { children: ReactNode }) {
  return (
    <div data-mu-workspace="" style={{ minHeight: '100%' }}>
      <WorkspaceBar />
      {children}
    </div>
  );
}
