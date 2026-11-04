import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { copy } from '../config/copy';
import type { ItemKind, ItemView, Link } from '../data/types';
import { gapLabel } from '../features/foreshadow/gap';
import { hubPos, layoutStars, type Pos } from '../features/map/layout';
import { shapePath, starRadius, starState } from '../features/map/stars';
import { controlPoint, linkEnds, pairOffsets, pointOnCurve } from '../features/map/links';
import s from './StarMap.module.css';

/*
 * 우주 지도(BUILD_SPEC 6.7). 확대·축소(휠, 두 손가락, 버튼), 끌어서 이동, Tab·Enter로 별 고르기, 선을 눌러 관계 보기.
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
  onLink,
  activeLinkId = null,
  aiResolve,
  view,
  onView,
}: {
  title: string;
  items: ItemView[];
  links: Link[];
  selected: Set<string>;
  focusId: string | null;
  onStar: (id: string) => void;
  /** 선을 누르면 두 별의 관계를 보여 준다 */
  onLink?: (id: string) => void;
  activeLinkId?: string | null;
  /** AI가 회수 장면이라고 추정한 회차(작가 확인 전) */
  aiResolve?: Map<string, number>;
  view: MapView;
  onView: (v: MapView) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const justDragged = useRef(false);
  const [hover, setHover] = useState<string | null>(null);

  const pos = useMemo(() => layoutStars(items, links), [items, links]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const offsets = useMemo(() => pairOffsets(links), [links]);
  /** 선의 시작·제어점·끝(화살표 방향). 같은 두 별 사이에 선이 여럿이면 서로 반대쪽으로 휜다. */
  const geometry = (l: Link) => {
    const { from, to, directed } = linkEnds(l);
    const pa = pos.get(l.a);
    const pb = pos.get(l.b);
    const p0 = pos.get(from);
    const p1 = pos.get(to);
    if (!pa || !pb || !p0 || !p1) return null;
    const c = controlPoint(pa, pb, offsets.get(l.id) ?? 0);
    return { p0, p1, c, directed, to };
  };
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
  /** (cx, cy) 화면 지점을 고정한 채 factor배 확대 */
  const zoomAt = (v: MapView, cx: number, cy: number, factor: number): MapView => {
    const p = toSvg(cx, cy);
    const k = Math.min(4, Math.max(0.35, v.k * factor));
    return { k, x: p.x - ((p.x - v.x) * k) / v.k, y: p.y - ((p.y - v.y) * k) / v.k };
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
      set(zoomAt(v, e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 끌어서 이동(한 손가락·마우스), 두 손가락으로 벌리고 오므려 확대·축소
  const onDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current = null;
      return;
    }
    if ((e.target as Element).closest('[data-star]')) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current != null && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0 && pinch.current > 0) onView(zoomAt(view, (a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.current));
      pinch.current = d;
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
    const a = toSvg(d.x, d.y);
    const b = toSvg(e.clientX, e.clientY);
    onView({ ...view, x: d.vx + (b.x - a.x), y: d.vy + (b.y - a.y) });
  };
  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    justDragged.current = Boolean(drag.current?.moved);
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
  // 가까이 본 별(마우스·키보드 초점·정보창)과 이어진 선·별을 강조
  const lit = new Set<string>();
  const neighbors = new Set<string>();
  if (near)
    for (const l of links)
      if (l.a === near || l.b === near) {
        lit.add(l.kind === 'co_occur' ? `${l.a}|${l.b}` : l.id);
        neighbors.add(l.a === near ? l.b : l.a);
      }

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
        {/* 종류 연결(가는 실선) */}
        {kinds.map((k) => {
          const h = hubPos(k);
          return <line key={`c-${k}`} x1={0} y1={0} x2={h.x} y2={h.y} className={s.kindLine} />;
        })}
        {items.map((i) => {
          const h = hubPos(i.kind);
          const p = center(pos.get(i.id));
          return <line key={`k-${i.id}`} x1={h.x} y1={h.y} x2={p.x} y2={p.y} className={s.kindLine} opacity={0.5} />;
        })}
        {/* 화살촉(방향 있는 선) */}
        <defs>
          <marker id="arrow-manual" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" className={s.arrowManual} />
          </marker>
          <marker id="arrow-ai" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" className={s.arrowAi} />
          </marker>
        </defs>
        {/* 항목 사이 연결선(실제 기록된 관계만) */}
        {links.map((l) => {
          const g = geometry(l);
          if (!g) return null;
          const on = lit.has(l.kind === 'co_occur' ? `${l.a}|${l.b}` : l.id) || activeLinkId === l.id;
          const name = byId.get(l.a)?.name ?? '';
          const other = byId.get(l.b)?.name ?? '';
          const tip = <title>{`${name} — ${other}: ${l.kind === 'ai' ? `${copy.labels.ai}${l.label ? ` · ${l.label}` : ''}` : l.label ?? copy.map.info.coTimes(l.weight)}`}</title>;
          const pick = onLink
            ? {
                'data-link': true,
                onClick: () => {
                  if (justDragged.current) return;
                  onLink(l.id);
                },
              }
            : {};
          if (l.kind === 'co_occur') {
            return (
              <g key={l.id} {...pick}>
                <line x1={g.p0.x} y1={g.p0.y} x2={g.p1.x} y2={g.p1.y} className={`${s.coLine} ${on ? s.lineOn : ''}`} strokeWidth={Math.min(1 + l.weight * 0.6, 4)} />
                {onLink && <line x1={g.p0.x} y1={g.p0.y} x2={g.p1.x} y2={g.p1.y} className={s.lineHit} />}
                {tip}
              </g>
            );
          }
          // 방향이 있으면 화살촉이 별에 가려지지 않게 끝을 별 크기만큼 당긴다(곡선의 끝 방향으로)
          const end = g.directed ? shorten(g.c, g.p1, starRadius(byId.get(g.to)?.mention_count ?? 0) + 8) : g.p1;
          const d = `M${g.p0.x},${g.p0.y} Q${g.c.x},${g.c.y} ${end.x},${end.y}`;
          return (
            <g key={l.id} {...pick}>
              <path
                d={d}
                className={`${s.curve} ${l.kind === 'ai' ? s.aiLine : s.manualLine} ${on ? s.lineOn : ''}`}
                strokeWidth={on ? 2.6 : 1.8}
                markerEnd={g.directed ? `url(#arrow-${l.kind})` : undefined}
              />
              {onLink && <path d={d} className={`${s.curve} ${s.lineHit}`} />}
              {tip}
            </g>
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
              <path d={shapePath(k, 10)} className={s[k]} />
              <text y={50}>{copy.labels.kind[k]}</text>
            </g>
          );
        })}
        {/* 관계 이름(AI 추정·작가가 이은 선) */}
        {links.map((l) => {
          const g = geometry(l);
          if (!g || !l.label || l.kind === 'co_occur') return null;
          return (
            <text key={`t-${l.id}`} {...labelSpot(g.p0, g.c, g.p1, kinds)} className={`${s.linkLabel} ${l.kind === 'manual' ? s.linkLabelManual : ''}`}>
              {l.label}
            </text>
          );
        })}
        {/* 별 */}
        {items.map((i) => {
          const p = center(pos.get(i.id));
          const isSel = selected.has(i.id);
          const r = starRadius(i.mention_count);
          const st = starState(i, maxGap, aiResolve?.get(i.id) ?? null);
          const details = [
            i.gap != null && i.gap > 0 ? gapLabel(i.gap).text : '',
            st.done ? copy.labels.status[i.status] : st.planned ? copy.labels.status.reuse_planned : '',
            st.forgotten ? copy.map.state.forgotten : '',
            st.aiResolveEp ? copy.map.state.aiResolve(st.aiResolveEp) : '',
            i.source === 'ai' || !i.confirmed ? copy.labels.ai : '',
          ].filter(Boolean);
          const mark = [i.source === 'ai' || !i.confirmed ? 'AI' : '', st.aiResolveEp ? copy.map.state.aiResolveShort : ''].filter(Boolean).join(' · ');
          return (
            <g
              key={i.id}
              data-star
              tabIndex={0}
              role="button"
              aria-pressed={isSel}
              aria-label={copy.map.starLabel(i.name, copy.labels.kind[i.kind], details.join(', '))}
              className={`${s.star} ${s[i.kind]} ${isSel ? s.selected : ''} ${focusId === i.id ? s.focused : ''} ${neighbors.has(i.id) ? s.neighbor : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              onClick={() => onStar(i.id)}
              onKeyDown={key(i.id)}
              onPointerEnter={() => setHover(i.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i.id)}
              onBlur={() => setHover(null)}
            >
              <circle r={r + 12} className={s.hit} />
              {st.forgotten && !isSel && <circle r={r + 7} className={s.forgottenRing} />}
              {(st.done || st.planned) && <circle r={r + 7} className={st.done ? s.doneRing : s.plannedRing} />}
              <path d={shapePath(i.kind, r)} className={s.shape} opacity={isSel || near === i.id || neighbors.has(i.id) ? 1 : st.brightness} />
              <text y={r + 24}>{i.name}</text>
              {mark && (
                <text y={-r - 10} className={s.aiMark}>
                  {mark}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** a → b 선의 끝을 by만큼 a 쪽으로 당긴다. */
function shorten(a: Pos, b: Pos, by: number): Pos {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= by * 2) return b;
  return { x: b.x - ((b.x - a.x) / d) * by, y: b.y - ((b.y - a.y) / d) * by };
}

/** 관계 이름 위치: 선(곡선) 가운데에 두되, 가운데 원이나 종류 동그라미와 겹치면 선을 따라 옮긴다. */
function labelSpot(a: Pos, c: Pos, b: Pos, kinds: ItemKind[]) {
  const blockers = [{ x: 0, y: 0, r: 95 }, ...kinds.map((k) => ({ ...hubPos(k), r: 60 }))];
  for (const t of [0.5, 0.35, 0.65, 0.22, 0.78]) {
    const p = pointOnCurve(a, c, b, t);
    if (blockers.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > o.r)) return { x: p.x, y: p.y + 6 };
  }
  const m = pointOnCurve(a, c, b, 0.5);
  return { x: m.x, y: m.y + 6 };
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

/** 별 하나를 화면 가운데로 옮기는 view 값. */
export function viewFocusing(items: ItemView[], links: Link[], id: string, k = 1.4): MapView {
  const p = layoutStars(items, links).get(id);
  return p ? { k, x: -p.x * k, y: -p.y * k } : MAP_HOME;
}
