import { copy } from '../config/copy';
import s from './Feedback.module.css';

/** 불러오는 중 표시. 모든 비동기 화면에 쓴다(BUILD_SPEC 11장). */
export function Loading({ label = copy.common.loading, fullPage }: { label?: string; fullPage?: boolean }) {
  return (
    <div className={fullPage ? `${s.loading} ${s.fullPage}` : s.loading} role="status" aria-live="polite">
      <span className={s.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}
