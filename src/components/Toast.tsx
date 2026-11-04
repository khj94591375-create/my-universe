import { useEffect, useState } from 'react';
import { copy } from '../config/copy';
import s from './Toast.module.css';

/* 저장·오류 알림. 어디서든 showToast('문구')로 띄운다. */

/** action: 알림 안의 버튼 하나(예: 되돌리기). 누르면 실행하고 알림을 닫는다. */
export type ToastAction = { label: string; run: () => void };
type ToastMsg = { id: number; text: string; tone: 'info' | 'error'; action?: ToastAction };
let seq = 0;
const subs = new Set<(t: ToastMsg) => void>();

export function showToast(text: string, tone: 'info' | 'error' = 'info', action?: ToastAction) {
  const t = { id: ++seq, text, tone, action };
  subs.forEach((fn) => fn(t));
}

/** 앱에 한 번만 둔다(App.tsx). */
export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setItems((list) => [...list, t]);
      // 버튼이 있는 알림은 누를 시간을 조금 더 준다
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.action ? 7000 : 4000);
    };
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);
  return (
    <div className={s.host} aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`${s.toast} ${t.tone === 'error' ? s.error : ''}`} role={t.tone === 'error' ? 'alert' : 'status'}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              className={s.action}
              onClick={() => {
                t.action?.run();
                setItems((list) => list.filter((x) => x.id !== t.id));
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))} aria-label={copy.toast.close}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
