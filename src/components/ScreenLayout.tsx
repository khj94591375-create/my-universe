import type { ReactNode } from 'react';
import s from './ScreenLayout.module.css';

/**
 * 모든 작품 화면의 공통 틀. 화면 = 제목 + 오른쪽 위 행동(action) + 섹션들.
 * 버튼을 "오른쪽 위로" 옮기려면 action에 넣기만 하면 된다. (BUILD_SPEC 4.5)
 */
export function ScreenLayout({ eyebrow, title, action, children }: { eyebrow?: string; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={s.screen}>
      <header className={s.top}>
        <h1 className={s.title}>
          {eyebrow && <small className={s.eyebrow}>{eyebrow}</small>}
          {title}
        </h1>
        {action && <div className={s.action}>{action}</div>}
      </header>
      {children}
    </div>
  );
}

/** 2단 배치. 좁은 화면에서는 1단으로 쌓인다. */
export function Columns({ children, ratio = '1.4fr 1fr' }: { children: ReactNode; ratio?: string }) {
  return (
    <div className={s.columns} style={{ ['--cols' as string]: ratio }}>
      {children}
    </div>
  );
}

export function Column({ children }: { children: ReactNode }) {
  return <div className={s.column}>{children}</div>;
}
