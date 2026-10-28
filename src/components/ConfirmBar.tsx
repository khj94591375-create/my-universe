import { Button } from './Button';
import s from './Feedback.module.css';

/** 브라우저 confirm() 대신 쓰는 화면 안 확인 막대(BUILD_SPEC 4.4, 11장). */
export function ConfirmBar({ message, confirmLabel, cancelLabel, onConfirm, onCancel, busy, danger = true }: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={s.confirm} role="alertdialog" aria-label={message}>
      <p>{message}</p>
      <div className={s.row}>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={busy} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
