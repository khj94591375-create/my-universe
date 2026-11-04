import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import s from './Button.module.css';

type Variant = 'primary' | 'accent' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  block?: boolean;
};

/** 공통 버튼. 색은 variant로만 바꾼다. accent(금색)는 화면마다 최우선 행동 하나에만. */
export function Button({ variant = 'primary', size = 'md', icon, loading, block, children, className, disabled, ...rest }: Props) {
  const cls = [s.btn, s[variant], s[size], block ? s.block : '', className ?? ''].join(' ');
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {loading ? '처리 중…' : children}
    </button>
  );
}

/** 버튼 모양의 링크(다른 화면으로 이동할 때). */
export function ButtonLink({ to, variant = 'primary', size = 'md', className, children, ...rest }: Omit<LinkProps, 'className'> & { variant?: Variant; size?: Size; className?: string }) {
  const cls = [s.btn, s[variant], s[size], s.asLink, className ?? ''].join(' ');
  return (
    <Link to={to} className={cls} {...rest}>
      {children}
    </Link>
  );
}
