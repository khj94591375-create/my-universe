import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { copy } from '../config/copy';
import type { ItemKind, ItemView, Link } from '../data/types';
import { gapLabel } from '../features/foreshadow/gap';
import { hubPos, layoutStars, starOpacity, type Pos } from '../features/map/layout';
import s from './StarMap.module.css';

/*
 * 우주 지도(BUILD_SPEC 6.7). 확대·축소(휠, 버튼), 끌어서 이동, Tab·Enter로 별 고르기.
 * 색은 StarMap.module.css의 토큰만 쓴다.
 */

export type MapView = { k: number; x: number; y: number };
export const MAP_HOME: MapView = { k: 1, x: 0, y: 0 };

export function StarMap({
  title,
  items,
  links,
  selected,
  focusId,
  onStar,
  view,
  onView,
}: {
  title: string;
  items: ItemView[];
  links: Link[];
  selected: Set<string>;
  focusId: string | null;
  onStar: (id: string) => void;
  view: MapView;
  onView: (v: MapView) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const pos = useMemo(() => layoutStars(items, links), [items, links]);
  // 별들이 차지한 범위에 맞춰 화면 크기를 정한다(라벨이 읽히도록)
  const vb = useMemo(() => {
    const pts = [...pos.values(), { x: 0, y: 0 }];
    const pad = 90;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const half = { w: Math.max(...xs.map(Math.abs)) + pad, h: Math.max(...ys.map(Math.abs)) + pad };
    return `${-half.w} ${-half.h} ${half.w * 2} ${half.h * 2}`;
  }, [pos]);
  const maxGap = Math.max(0, ...items.map((i) => i.gap ?? 0));
  const kinds = [...new Set(items.map((i) => i.kind))] as ItemKind[];

  /** 화면 좌표 → SVG 좌표 */
  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  // 휠 확대·축소. React의 wheel 이벤트는 passive라 페이지 스크롤을 막지 못해 직접 등록한다.
  const latest = useRef({ view, onView });
  latest.current = { view, onView };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const { view: v, onView: set } = latest.current;
      const p = toSvg(e.clientX, e.clientY);
      const k = Math.min(4, Math.max(0.35, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      // 커서 아래 지점이 그대로 있도록
      set({ k, x: p.x - ((p.x - v.x) * k) / v.k, y: p.y - ((p.y - v.y) * k) / v.k });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('[data-star]')) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const a = toSvg(d.x, d.y);
    const b = toSvg(e.clientX, e.clientY);
    d.moved = true;
    onView({ ...view, x: d.vx + (b.x - a.x), y: d.vy + (b.y - a.y) });
  };
  const onUp = () => {
    drag.current = null;
  };

  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStar(id);
    }
  };

  const center = (p: Pos | undefined) => p ?? { x: 0, y: 0 };
  const near = hover ?? focusId;
  const lit = new Set<string>();
  if (near) for (const l of links) if (l.a === near || l.b === near) lit.add(l.kind === 'co_occur' ? `${l.a}|${l.b}` : l.id);

  return (
    <svg
      ref={svgRef}
      className={s.svg}
      viewBox={vb}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={copy.map.label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {/* 종류 연결(실선) */}
        {kinds.map((k) => {
          const h = hubPos(k);
          return <line key={`c-${k}`} x1={0} y1={0} x2={h.x} y2={h.y} className={s.kindLine} />;
        })}
        {items.map((i) => {
          const h = hubPos(i.kind);
          const p = center(pos.get(i.id));
          return <line key={`k-${i.id}`} x1={h.x} y1={h.y} x2={p.x} y2={p.y} className={s.kindLine} opacity={0.35} />;
        })}
        {/* 항목 사이 연결선 */}
        {links.map((l) => {
          const a = pos.get(l.a);
          const b = pos.get(l.b);
          if (!a || !b) return null;
          const on = lit.has(l.kind === 'co_occur' ? `${l.a}|${l.b}` : l.id);
          const cls = l.kind === 'co_occur' ? s.coLine : l.kind === 'ai' ? s.aiLine : s.manualLine;
          return (
            <line
              key={l.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`${cls} ${on ? s.lineOn : ''}`}
              strokeWidth={l.kind === 'co_occur' ? Math.min(1 + l.weight * 0.6, 4) : 1.6}
            >
              <title>{l.kind === 'ai' ? `${copy.labels.ai}${l.label ? `: ${l.label}` : ''}` : (l.label ?? copy.map.legendCo)}</title>
            </line>
          );
        })}
        {/* 중심과 종류 */}
        <g className={s.center}>
          <circle r={52} />
          <title>{title}</title>
          {centerLines(title).map((line, idx, arr) => (
            <text key={idx} y={(idx - (arr.length - 1) / 2) * 17 + 5} style={{ fontSize: arr.length > 2 ? 13 : arr.length > 1 ? 15 : 17 }}>
              {line}
            </text>
          ))}
        </g>
        {kinds.map((k) => {
          const h = hubPos(k);
          return (
            <g key={k} className={s.hub} transform={`translate(${h.x} ${h.y})`}>
              <circle r={26} />
              <text y={50}>{copy.labels.kind[k]}</text>
            </g>
          );
        })}
        {/* 관계 이름(AI 추정·작가가 이은 선) */}
        {links.map((l) => {
          const a = pos.get(l.a);
          const b = pos.get(l.b);
          if (!a || !b || !l.label || l.kind === 'co_occur') return null;
          return (
            <text key={`t-${l.id}`} {...labelSpot(a, b, kinds)} className={`${s.linkLabel} ${l.kind === 'manual' ? s.linkLabelManual : ''}`}>
              {l.label}
            </text>
          );
        })}
        {/* 별 */}
        {items.map((i) => {
          const p = center(pos.get(i.id));
          const isSel = selected.has(i.id);
          const r = 10 + Math.min(i.mention_count, 8) * 0.8;
          const gap = i.gap != null && i.gap > 0 ? gapLabel(i.gap).text : '';
          return (
            <g
              key={i.id}
              data-star
              tabIndex={0}
              role="button"
              aria-pressed={isSel}
              aria-label={copy.map.starLabel(i.name, copy.labels.kind[i.kind], gap)}
              className={`${s.star} ${s[i.kind]} ${isSel ? s.selected : ''} ${focusId === i.id ? s.focused : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              opacity={isSel ? 1 : starOpacity(i.gap, maxGap)}
              onClick={() => onStar(i.id)}
              onKeyDown={key(i.id)}
              onPointerEnter={() => setHover(i.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i.id)}
              onBlur={() => setHover(null)}
            >
              <circle r={r + 10} className={s.hit} />
              <path d={starPath(r)} />
              <text y={r + 22}>{i.name}</text>
              {(i.source === 'ai' || !i.confirmed) && <text y={-r - 6} className={s.aiMark}>AI</text>}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** 관계 이름 위치: 선 가운데에 두되, 가운데 원이나 종류 동그라미와 겹치면 선을 따라 옮긴다. */
function labelSpot(a: Pos, b: Pos, kinds: ItemKind[]) {
  const blockers = [{ x: 0, y: 0, r: 95 }, ...kinds.map((k) => ({ ...hubPos(k), r: 60 }))];
  for (const t of [0.5, 0.35, 0.65, 0.22, 0.78]) {
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (blockers.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > o.r)) return { x: p.x, y: p.y - 6 };
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 6 };
}

/** 작품 제목을 가운데 원 안에 들어가도록 최대 3줄로 나눈다. 넘치면 말줄임(…). */
export function centerLines(title: string, perLine = 6, maxLines = 3): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of title.trim().split(/\s+/)) {
    let w = word;
    if (cur && (cur + ' ' + w).length > perLine) {
      lines.push(cur);
      cur = '';
    }
    while (w.length > perLine) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push(w.slice(0, perLine));
      w = w.slice(perLine);
    }
    cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = kept[maxLines - 1].slice(0, perLine - 1) + '…';
  return kept;
}

function starPath(r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(rr * Math.cos(a)).toFixed(1)},${(rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** 별 하나를 화면 가운데로 옮기는 view 값. */
export function viewFocusing(items: ItemView[], links: Link[], id: string, k = 1.4): MapView {
  const p = layoutStars(items, links).get(id);
  return p ? { k, x: -p.x * k, y: -p.y * k } : MAP_HOME;
}
