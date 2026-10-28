import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
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

/** 이름표가 붙은 여러 줄 입력칸. */
export function TextArea({ label, hideLabel, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hideLabel?: boolean }) {
  const id = useId();
  return (
    <label className={s.field} htmlFor={id}>
      <span className={hideLabel ? s.srOnly : s.fieldLabel}>{label}</span>
      <textarea id={id} className={`${s.input} ${s.textarea}`} {...rest} />
    </label>
  );
}

/** 이름표가 붙은 선택 상자. options: [값, 보이는 글자]. */
export function SelectField({ label, hideLabel, options, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hideLabel?: boolean; options: [string, string][] }) {
  const id = useId();
  return (
    <label className={s.field} htmlFor={id}>
      <span className={hideLabel ? s.srOnly : s.fieldLabel}>{label}</span>
      <select id={id} className={s.input} {...rest}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
