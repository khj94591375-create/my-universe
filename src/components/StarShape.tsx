import type { ItemKind } from '../data/types';
import { shapePath } from '../features/map/stars';
import s from './StarShape.module.css';

/** 별 모양 아이콘(캐릭터 동그라미·설정 마름모·복선 반짝별). 필터·범례에 쓰는 장식. */
export function StarShape({ kind, size = 14 }: { kind: ItemKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-13 -13 26 26" aria-hidden="true" focusable="false" className={`${s.shape} ${s[kind]}`}>
      <path d={shapePath(kind, 11)} />
    </svg>
  );
}
