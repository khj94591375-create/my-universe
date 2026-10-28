import type { ReactNode } from 'react';
import s from './Tag.module.css';

export type TagTone = 'neutral' | 'warn' | 'ok' | 'info' | 'gold' | 'ai';

/** 상태 표시는 색과 글자를 항상 함께 쓴다(색만으로 표현 금지). */
export function Tag({ tone = 'neutral', children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={[s.tag, s[tone]].join(' ')}>{children}</span>;
}
