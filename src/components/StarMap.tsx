import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { copy } from '../config/copy';
import type { ItemKind, ItemView, Link } from '../data/types';
import { gapLabel } from '../features/foreshadow/gap';
import { hubPos, layoutStars, type Pos } from '../features/map/layout';
import { shapePath, starRadius, starState } from '../features/map/stars';
import { circleBox, LABEL_FONT, LINK_FONT, placeLinkLabels, placeStarLabels, textBox } from '../features/map/labels';
import { controlPoint, linkEnds, pairOffsets, pointOnCurve } from '../features/map/links';
import s from './StarMap.module.css';

/*
 * 우주 지도(BUILD_SPEC 6.7). 확대·축소(휠, 두 손가락, 버튼), 끌어서 이동, Tab·Enter로 별 고르기, 선을 눌러 관계 보기.
 * 색은 StarMap.module.css의 토큰만 쓴다.
 */

/** 아무것도 고르지 않았을 때 한 번에 보여 줄 관계 이름 수 */
const MAX_LINK_LABELS = 15;

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
  onBackground,
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
  /** 빈 곳을 눌렀을 때(끌어서 옮긴 경우는 제외) */
  onBackground?: () => void;
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
  const [hover, setHoverNow] = useState<string | null>(null);
  // 마우스가 별 가장자리에서 잠깐 벗어나도 이름표가 깜빡이지 않게 조금 기다렸다 끈다
  const leaveTimer = useRef<number | undefined>(undefined);
  const setHover = (id: string | null) => {
    window.clearTimeout(leaveTimer.current);
    if (id) setHoverNow(id);
    else leaveTimer.current = window.setTimeout(() => setHoverNow(null), 120);
  };
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

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
    const pad = 80;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const half = { w: Math.max(...xs.map(Math.abs)) + pad, h: Math.max(...ys.map(Math.abs)) + pad };
    return `${-half.w} ${-half.h} ${half.w * 2} ${half.h * 2}`;
  }, [pos]);
  const maxGap = Math.max(0, ...items.map((i) => i.gap ?? 0));
  const kinds = [...new Set(items.map((i) => i.kind))] as ItemKind[];

  // 지도 1칸이 화면에서 몇 px인지(창 크기에 따라 바뀜). 이름 글자를 화면에서 늘 같은 크기로 그리는 데 쓴다.
  const [unitPx, setUnitPx] = useState(0.6);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const [, , vw, vh] = vb.split(' ').map(Number);
    const measure = () => {
      const r = svg.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setUnitPx(Math.min(r.width / vw, r.height / vh));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [vb]);

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
  const k = view.k;
  /** 이름 배치에 쓰는 실제 배율(확대 × 화면 맞춤) */
  const ks = view.k * unitPx;
  const near = hover ?? focusId;
  // 강조(나머지 흐림)는 누른 별(고른 별·살펴보는 별)과 그 별에 실제로 이어진 별만.
  // 마우스를 올리기만 하면 이름표와 이어진 선만 보여 준다(화면이 크게 바뀌지 않게).
  const anchors = new Set<string>([...selected, ...(focusId ? [focusId] : [])].filter((id) => byId.has(id)));
  const lit = new Set<string>();
  const neighbors = new Set<string>();
  for (const l of links) {
    if (anchors.has(l.a) || anchors.has(l.b)) {
      lit.add(l.id);
      if (!anchors.has(l.a)) neighbors.add(l.a);
      if (!anchors.has(l.b)) neighbors.add(l.b);
    }
    if (hover && (l.a === hover || l.b === hover)) lit.add(l.id);
  }
  const focusMode = anchors.size > 0;
  const isLit = (id: string) => anchors.has(id) || neighbors.has(id);
  const dense = items.length > 30;

  // 이름표: 확대 배율에 맞춰 겹치지 않는 것만(고른 별·가리킨 별은 항상)
  // 가운데 원·종류 동그라미·종류 이름(캐릭터·설정·복선) 자리는 별 이름이 피해 간다
  const blocked = useMemo(() => {
    const f = LABEL_FONT / ks;
    return [
      circleBox(0, 0, 54),
      ...kinds.flatMap((kd) => {
        const h = hubPos(kd);
        return [circleBox(h.x, h.y, 28), textBox(h.x, h.y + 26 + f * 0.65, copy.labels.kind[kd], f * 0.8)];
      }),
    ];
  }, [kinds.join(), ks]); // eslint-disable-line react-hooks/exhaustive-deps
  const anchorKey = [...anchors].sort().join(',');
  const starLabels = useMemo(() => {
    const cands = items
      .filter((i) => !focusMode || isLit(i.id))
      .map((i) => {
        const q = center(pos.get(i.id));
        return { id: i.id, x: q.x, y: q.y, r: starRadius(i.mention_count), name: i.name, priority: (anchors.has(i.id) ? 1000 : neighbors.has(i.id) ? 500 : 0) + i.mention_count, force: anchors.has(i.id) };
      });
    return placeStarLabels(cands, ks, blocked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pos, ks, anchorKey, blocked]);
  const linkLabels = useMemo(() => {
    const cands = links
      // 고른 별이 있으면 그 별의 관계만. 없으면 두 별 이름이 모두 보이는 관계만(별이 많을 때 관계 이름이 지도를 덮지 않게)
      .filter((l) => l.label && l.kind !== 'co_occur' && (focusMode ? lit.has(l.id) : starLabels.has(l.a) && starLabels.has(l.b)))
      .map((l) => {
        const g = geometry(l);
        return g ? { id: l.id, text: l.label as string, at: (t: number) => pointOnCurve(g.p0, g.c, g.p1, t), force: activeLinkId === l.id } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    const taken = [...blocked, ...starLabels.values(), ...items.map((i) => { const q = center(pos.get(i.id)); return circleBox(q.x, q.y, starRadius(i.mention_count)); })];
    const placed = placeLinkLabels(cands, ks, taken);
    if (focusMode) return placed;
    // 아무것도 고르지 않았을 때는 관계 이름을 최대 15개까지만
    return new Map([...placed].slice(0, MAX_LINK_LABELS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, starLabels, ks, activeLinkId, anchorKey]);

  const fs = LABEL_FONT / ks;
  const lfs = LINK_FONT / ks;
  // 이름표는 마우스·키보드로 가리킬 때만(고른 별은 오른쪽 창·간단 정보 카드에서 본다)
  const tipItem = hover ? byId.get(hover) : null;

  return (
    <svg
      ref={svgRef}
      className={`${s.svg} ${dense ? s.dense : ''} ${focusMode ? s.focusMode : ''}`}
      viewBox={vb}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={copy.map.label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={(e) => {
        if (justDragged.current || (e.target as Element).closest('[data-star], [data-link]')) return;
        onBackground?.();
      }}
    >
      <defs>
        {/* 고른 별 뒤의 은은한 광채(움직임 없음) */}
        <radialGradient id="star-glow">
          <stop offset="0%" className={s.glowIn} />
          <stop offset="100%" className={s.glowOut} />
        </radialGradient>
        {/* 화살촉(방향 있는 선) */}
        <marker id="arrow-manual" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className={s.arrowManual} />
        </marker>
        <marker id="arrow-ai" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className={s.arrowAi} />
        </marker>
      </defs>
      <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
        {/* 종류 연결(가는 실선) */}
        {kinds.map((kd) => {
          const h = hubPos(kd);
          return <line key={`c-${kd}`} x1={0} y1={0} x2={h.x} y2={h.y} className={s.kindLine} />;
        })}
        {items.map((i) => {
          const h = hubPos(i.kind);
          const q = center(pos.get(i.id));
          return <line key={`k-${i.id}`} x1={h.x} y1={h.y} x2={q.x} y2={q.y} className={`${s.kindLine} ${s.spoke}`} />;
        })}
        {/* 항목 사이 연결선(실제 기록된 관계만) */}
        {links.map((l) => {
          const g = geometry(l);
          if (!g) return null;
          const on = lit.has(l.id) || activeLinkId === l.id;
          const name = byId.get(l.a)?.name ?? '';
          const other = byId.get(l.b)?.name ?? '';
          const tip = <title>{`${name} — ${other}: ${l.kind === 'ai' ? `${copy.labels.ai}${l.label ? ` · ${l.label}` : ''}` : l.label ?? copy.map.info.coTimes(l.weight)}`}</title>;
          const cls = `${on ? s.lineOn : focusMode ? s.lineDim : ''}`;
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
                <line x1={g.p0.x} y1={g.p0.y} x2={g.p1.x} y2={g.p1.y} className={`${s.coLine} ${cls}`} strokeWidth={Math.min(1 + l.weight * 0.6, 4)} />
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
              <path d={d} className={`${s.curve} ${l.kind === 'ai' ? s.aiLine : s.manualLine} ${cls}`} strokeWidth={on ? 2.6 : 1.8} markerEnd={g.directed ? `url(#arrow-${l.kind})` : undefined} />
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
        {kinds.map((kd) => {
          const h = hubPos(kd);
          return (
            <g key={kd} className={s.hub} transform={`translate(${h.x} ${h.y})`}>
              <circle r={26} />
              <path d={shapePath(kd, 10)} className={s[kd]} />
              <text y={26 + fs * 0.95} style={{ fontSize: fs * 0.8 }}>
                {copy.labels.kind[kd]}
              </text>
            </g>
          );
        })}
        {/* 별 */}
        {items.map((i) => {
          const q = center(pos.get(i.id));
          const isSel = selected.has(i.id);
          const r = starRadius(i.mention_count);
          const st = starState(i, maxGap, aiResolve?.get(i.id) ?? null);
          const details = starDetails(i, st);
          const mark = [i.source === 'ai' || !i.confirmed ? 'AI' : '', st.aiResolveEp ? copy.map.state.aiResolveShort : ''].filter(Boolean).join(' · ');
          const dim = focusMode && !isLit(i.id);
          const label = starLabels.get(i.id);
          return (
            <g
              key={i.id}
              data-star
              data-id={i.id}
              tabIndex={0}
              role="button"
              aria-pressed={isSel}
              aria-label={copy.map.starLabel(i.name, copy.labels.kind[i.kind], details.join(', '))}
              className={`${s.star} ${s[i.kind]} ${isSel ? s.selected : ''} ${near === i.id ? s.focused : ''} ${neighbors.has(i.id) ? s.neighbor : ''} ${dim ? s.dim : ''}`}
              transform={`translate(${q.x} ${q.y})`}
              onClick={() => onStar(i.id)}
              onKeyDown={key(i.id)}
              onPointerEnter={() => setHover(i.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i.id)}
              onBlur={() => setHover(null)}
            >
              {isSel && <circle r={r * 2.8} fill="url(#star-glow)" className={s.glow} />}
              <circle r={r + 12} className={s.hit} />
              {st.forgotten && !isSel && <circle r={r + 7} className={s.forgottenRing} />}
              {(st.done || st.planned) && <circle r={r + 7} className={st.done ? s.doneRing : s.plannedRing} />}
              <path d={shapePath(i.kind, r)} className={s.shape} opacity={isSel || isLit(i.id) ? 1 : dim ? 0.22 : st.brightness} />
              {label && (
                <text y={label.y1 - q.y - fs * 0.3} style={{ fontSize: fs }}>
                  {i.name}
                </text>
              )}
              {mark && !dim && (
                <text y={-r - fs * 0.5} className={s.aiMark} style={{ fontSize: fs * 0.75 }}>
                  {mark}
                </text>
              )}
            </g>
          );
        })}
        {/* 관계 이름(자리가 있을 때만, 강조한 선은 항상) */}
        {links.map((l) => {
          const spot = linkLabels.get(l.id);
          if (!spot || !l.label) return null;
          return (
            <text key={`t-${l.id}`} x={spot.x} y={spot.y + lfs * 0.35} style={{ fontSize: lfs, strokeWidth: 4 / ks }} className={`${s.linkLabel} ${l.kind === 'manual' ? s.linkLabelManual : ''}`}>
              {l.label}
            </text>
          );
        })}
        {/* 가리킨 별의 이름표(맨 위): 이름 · 종류 · 상태 */}
        {tipItem && (() => {
          const q = center(pos.get(tipItem.id));
          const r = starRadius(tipItem.mention_count);
          const st = starState(tipItem, maxGap, aiResolve?.get(tipItem.id) ?? null);
          const line2 = [copy.labels.kind[tipItem.kind], ...starDetails(tipItem, st)].join(' · ');
          const f2 = fs * 0.8;
          const w = Math.max([...tipItem.name].length * fs, [...line2].length * f2 * 0.95) + fs;
          const h = fs * 1.4 + f2 * 1.4 + fs * 0.4;
          // 보이는 영역 안에 머물게(지도 가장자리에서 잘리지 않게)
          const [vx, vy, vw] = vb.split(' ').map(Number);
          const left = (vx - view.x) / k;
          const right = (vx + vw - view.x) / k;
          const cx = Math.min(Math.max(q.x, left + w / 2 + 4 / ks), right - w / 2 - 4 / ks);
          let top = q.y - r - 8 / ks - h;
          if (top < (vy - view.y) / k) top = q.y + r + 8 / ks + fs * 1.6; // 위가 막히면 별 이름 아래로
          return (
            <g className={s.tip} pointerEvents="none" aria-hidden="true">
              <rect x={cx - w / 2} y={top} width={w} height={h} rx={8 / ks} style={{ strokeWidth: 1 / ks }} />
              <text x={cx} y={top + fs * 1.15} style={{ fontSize: fs }} className={s.tipName}>
                {tipItem.name}
              </text>
              <text x={cx} y={top + fs * 1.35 + f2 * 1.2} style={{ fontSize: f2 }}>
                {line2}
              </text>
            </g>
          );
        })()}
      </g>
    </svg>
  );
}

/** 별 상태를 사람이 읽는 말로(이름표·화면 읽기 프로그램 공용). */
function starDetails(i: ItemView, st: ReturnType<typeof starState>): string[] {
  return [
    i.gap != null && i.gap > 0 ? gapLabel(i.gap).text : '',
    st.done ? copy.labels.status[i.status] : st.planned ? copy.labels.status.reuse_planned : '',
    st.forgotten ? copy.map.state.forgotten : '',
    st.aiResolveEp ? copy.map.state.aiResolve(st.aiResolveEp) : '',
    i.source === 'ai' || !i.confirmed ? copy.labels.ai : '',
  ].filter(Boolean);
}

/** a → b 선의 끝을 by만큼 a 쪽으로 당긴다. */
function shorten(a: Pos, b: Pos, by: number): Pos {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= by * 2) return b;
  return { x: b.x - ((b.x - a.x) / d) * by, y: b.y - ((b.y - a.y) / d) * by };
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
