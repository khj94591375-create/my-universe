import { useEffect, useState } from 'react';
import { copy } from '../config/copy';
import s from './Toast.module.css';

/* 저장·오류 알림. 어디서든 showToast('문구')로 띄운다. */

type ToastMsg = { id: number; text: string; tone: 'info' | 'error' };
let seq = 0;
const subs = new Set<(t: ToastMsg) => void>();

export function showToast(text: string, tone: 'info' | 'error' = 'info') {
  const t = { id: ++seq, text, tone };
  subs.forEach((fn) => fn(t));
}

/** 앱에 한 번만 둔다(App.tsx). */
export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 4000);
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
          <button type="button" onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))} aria-label={copy.toast.close}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
