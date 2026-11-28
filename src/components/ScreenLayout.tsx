import { useContext, type ReactNode } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { WorkTitleContext } from './workTitle';
import { ScreenTip } from './ScreenTip';
import type { TipId } from '../config/guide';
import s from './ScreenLayout.module.css';

/**
 * 모든 작품 화면의 공통 틀. 화면 = 제목 + 오른쪽 위 행동(action) + 섹션들.
 * 버튼을 "오른쪽 위로" 옮기려면 action에 넣기만 하면 된다. (BUILD_SPEC 4.5)
 */
export function ScreenLayout({ pageName, title, action, tip, tabs, children }: { /** 브라우저 탭 제목에만 쓰는 화면 이름(제목 위에 따로 보이지 않는다) */ pageName?: string; title: ReactNode; action?: ReactNode; tip?: TipId; /** 제목 위 하위 탭(원고 메뉴 등) */ tabs?: ReactNode; children: ReactNode }) {
  usePageTitle(pageName ?? (typeof title === 'string' ? title : null), useContext(WorkTitleContext));
  return (
    <div className={s.screen}>
      {tabs}
      <header className={s.top}>
        <h1 className={s.title}>
          {title}
        </h1>
        {action && <div className={s.action}>{action}</div>}
      </header>
      {tip && <ScreenTip id={tip} />}
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
