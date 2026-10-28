import type { ReactNode } from 'react';
import { copy } from '../config/copy';
import { Button } from './Button';
import s from './Feedback.module.css';

/** 오류 상태: 무엇이 잘못됐는지 + 다시 시도 또는 다른 행동. */
export function ErrorState({ title = copy.common.errorTitle, body, onRetry, action }: { title?: string; body?: string; onRetry?: () => void; action?: ReactNode }) {
  return (
    <div className={s.error} role="alert">
      <p className={s.errorTitle}>{title}</p>
      {body && <p className={s.errorBody}>{body}</p>}
      <div className={s.row}>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {copy.common.retry}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
