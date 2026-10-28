import type { ReactNode } from 'react';
import s from './EmptyState.module.css';

/** 빈 화면: 무엇이 나타날지 알려 주고 첫 행동을 제시한다. */
export function EmptyState({ title, body, action, stage }: { title: string; body?: string; action?: ReactNode; stage?: string }) {
  return (
    <div className={s.wrap}>
      <svg className={s.star} width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 0C21 13 27 19 40 20 27 21 21 27 20 40 19 27 13 21 0 20 13 19 19 13 20 0Z" />
      </svg>
      <p className={s.title}>{title}</p>
      {body && <p className={s.body}>{body}</p>}
      {action}
      {stage && <p className={s.stage}>구현 예정 단계: {stage}</p>}
    </div>
  );
}
