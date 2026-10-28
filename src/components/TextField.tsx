import { useId, type InputHTMLAttributes } from 'react';
import s from './Feedback.module.css';

/** 이름표가 붙은 한 줄 입력칸. */
export function TextField({ label, hideLabel, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hideLabel?: boolean }) {
  const id = useId();
  return (
    <label className={s.field} htmlFor={id}>
      <span className={hideLabel ? s.srOnly : s.fieldLabel}>{label}</span>
      <input id={id} className={s.input} {...rest} />
    </label>
  );
}
