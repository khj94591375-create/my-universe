import type { HTMLAttributes, ReactNode } from 'react';
import s from './Card.module.css';

type Props = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  tone?: 'default' | 'highlight' | 'navy';
  as?: 'section' | 'div' | 'article';
};

export function Card({ title, tone = 'default', as: Tag = 'section', children, className, ...rest }: Props) {
  return (
    <Tag className={[s.card, s[tone], className ?? ''].join(' ')} {...rest}>
      {title && <h2 className={s.title}>{title}</h2>}
      {children}
    </Tag>
  );
}
