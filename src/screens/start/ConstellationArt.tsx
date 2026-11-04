import type { ItemKind } from '../../data/types';
import { shapePath } from '../../features/map/stars';
import m from '../../components/StarMap.module.css';
import s from './StartScreen.module.css';

/*
 * 시작 화면 대표 카드의 장식 그림: 별과 별이 이어져 별자리가 되는 모습.
 * 실제 데이터가 아닌 설명용 그림이라 이름을 붙이지 않는다(장식, 화면 읽기 프로그램은 건너뜀).
 */
const STARS: { x: number; y: number; kind: ItemKind; r: number; dim?: boolean; done?: boolean }[] = [
  { x: -150, y: -40, kind: 'character', r: 15 },
  { x: -60, y: -95, kind: 'setting', r: 12 },
  { x: 40, y: -30, kind: 'character', r: 17 },
  { x: 140, y: -85, kind: 'foreshadow', r: 13, done: true },
  { x: 120, y: 60, kind: 'foreshadow', r: 12, dim: true },
  { x: -20, y: 75, kind: 'setting', r: 13 },
  { x: -170, y: 70, kind: 'foreshadow', r: 11, dim: true },
];
const LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
  [2, 5],
  [0, 5],
];

export function ConstellationArt() {
  return (
    <svg className={`${m.svg} ${s.constellation}`} viewBox="-230 -150 460 300" aria-hidden="true" focusable="false">
      {LINES.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={STARS[a].x} y1={STARS[a].y} x2={STARS[b].x} y2={STARS[b].y} className={m.coLine} strokeWidth={1.6} />
      ))}
      {STARS.map((st, i) => (
        <g key={i} className={`${m.star} ${m[st.kind]}`} transform={`translate(${st.x} ${st.y})`}>
          {st.dim && <circle r={st.r + 7} className={m.forgottenRing} />}
          {st.done && <circle r={st.r + 7} className={m.doneRing} />}
          <path d={shapePath(st.kind, st.r)} className={m.shape} opacity={st.dim ? 0.4 : 1} />
        </g>
      ))}
    </svg>
  );
}
