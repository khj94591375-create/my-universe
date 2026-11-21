import type { ReactNode } from 'react';
import s from './Tag.module.css';

export type TagTone = 'neutral' | 'warn' | 'ok' | 'info' | 'gold' | 'ai';

/**
 * 상태 표시는 색과 글자를 항상 함께 쓴다(색만으로 표현 금지).
 * plain: 바탕 없는 글자만(앞에 가운뎃점). 알약 모양은 꼭 눈에 띄어야 하는 것에만 쓴다.
 */
export function Tag({ tone = 'neutral', plain = false, children }: { tone?: TagTone; plain?: boolean; children: ReactNode }) {
  return <span className={[plain ? s.plain : s.tag, s[tone]].join(' ')}>{children}</span>;
}
