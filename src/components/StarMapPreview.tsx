import { useEffect, useMemo, useState } from 'react';
import type { ItemKind, ItemView, Link } from '../data/types';
import { hubPos, layoutStars } from '../features/map/layout';
import { shapePath, starRadius, starState } from '../features/map/stars';
import s from './StarMap.module.css';
import p from './StarMapPreview.module.css';

/**
 * 홈 화면용 우주 지도 미리보기(읽기 전용). 실제 등록된 항목·관계만 그린다.
 * 이름은 자주 나온 별 몇 개만 보여 주고, 탐험은 우주 지도 화면에서 한다.
 */
export function StarMapPreview({ items, links, label, maxLabels = 6 }: { items: ItemView[]; links: Link[]; label: string; maxLabels?: number }) {
  // 별이 많으면 배치 계산이 무거워서, 화면 글자를 먼저 보여 준 뒤 그린다
  const [ready, setReady] = useState(items.length <= 30);
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(t);
  }, [ready]);
  return ready ? <PreviewSvg items={items} links={links} label={label} maxLabels={maxLabels} /> : <div className={`${s.svg} ${p.preview}`} role="img" aria-label={label} />;
}

function PreviewSvg({ items, links, label, maxLabels }: { items: ItemView[]; links: Link[]; label: string; maxLabels: number }) {
  const pos = useMemo(() => layoutStars(items, links), [items, links]);
  const vb = useMemo(() => {
    const pts = [...pos.values(), { x: 0, y: 0 }];
    const pad = 70;
    const w = Math.max(...pts.map((q) => Math.abs(q.x))) + pad;
    const h = Math.max(...pts.map((q) => Math.abs(q.y))) + pad;
    return `${-w} ${-h} ${w * 2} ${h * 2}`;
  }, [pos]);
  const maxGap = Math.max(0, ...items.map((i) => i.gap ?? 0));
  const kinds = [...new Set(items.map((i) => i.kind))] as ItemKind[];
  const named = new Set([...items].sort((a, b) => b.mention_count - a.mention_count).slice(0, maxLabels).map((i) => i.id));

  return (
    <svg className={`${s.svg} ${p.preview}`} viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      {kinds.map((k) => {
        const h = hubPos(k);
        return <line key={`c-${k}`} x1={0} y1={0} x2={h.x} y2={h.y} className={s.kindLine} />;
      })}
      {items.map((i) => {
        const h = hubPos(i.kind);
        const q = pos.get(i.id);
        return q ? <line key={`k-${i.id}`} x1={h.x} y1={h.y} x2={q.x} y2={q.y} className={s.kindLine} opacity={0.45} /> : null;
      })}
      {links.map((l) => {
        const a = pos.get(l.a);
        const b = pos.get(l.b);
        if (!a || !b) return null;
        const cls = l.kind === 'co_occur' ? s.coLine : `${s.curve} ${l.kind === 'ai' ? s.aiLine : s.manualLine}`;
        return <line key={l.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cls} strokeWidth={1.6} />;
      })}
      <g className={s.center}>
        <circle r={30} />
      </g>
      {kinds.map((k) => {
        const h = hubPos(k);
        return (
          <g key={k} className={s.hub} transform={`translate(${h.x} ${h.y})`}>
            <circle r={18} />
            <path d={shapePath(k, 8)} className={s[k]} />
          </g>
        );
      })}
      {items.map((i) => {
        const q = pos.get(i.id);
        if (!q) return null;
        const r = starRadius(i.mention_count);
        const st = starState(i, maxGap);
        return (
          <g key={i.id} className={`${s.star} ${s[i.kind]}`} transform={`translate(${q.x} ${q.y})`}>
            {st.forgotten && <circle r={r + 7} className={s.forgottenRing} />}
            {st.done && <circle r={r + 7} className={s.doneRing} />}
            <path d={shapePath(i.kind, r)} className={s.shape} opacity={st.brightness} />
            {named.has(i.id) && <text y={r + 24}>{i.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}
