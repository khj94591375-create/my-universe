import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../../components/Button';
import { MAP_HOME, StarMap, viewFocusing, type MapView } from '../../../components/StarMap';
import { StarShape } from '../../../components/StarShape';
import { SelectField, TextField } from '../../../components/TextField';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { AiBadge, EvidenceQuote, GapTag, KindTag, StatusTag } from '../../../components/Badges';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { addManualLink, deleteLink } from '../../../data/items';
import { directionFor } from '../../../features/map/links';
import { episodesOf, linkedOf, linkKindText, relationText } from '../../../features/map/relations';
import { aiResolveEps, FORGOTTEN_GAP } from '../../../features/map/stars';
import type { ItemKind, Link as LinkRow } from '../../../data/types';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';
import { isUnconfirmedAi } from '../../../features/ai/review';
import { shortLabel } from '../../../features/map/labels';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];

/**
 * 지도 + 도구 막대(종류별 보기, 이름 찾기, 확대·축소) + 별 정보창 + 관계 정보창 + 연결 추가.
 * 지도에는 실제 기록된 항목과 관계만 그린다(임의로 잇지 않는다).
 */
export type MapFocus = {
  /** 지금 살펴보는 별(패널에서 펼쳐 보여 줌) */
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  /** 지도에서 강조할 관계선(관계 정보창) */
  linkId: string | null;
  setLinkId: (id: string | null) => void;
  /** 연결 추가를 시작한 별 */
  linkFrom: string | null;
  setLinkFrom: (id: string | null) => void;
  /** 연결 추가의 두 번째 별(둘 다 정해지면 지도 위에 관계 입력 칸) */
  linkTo: string | null;
  setLinkTo: (id: string | null) => void;
  /** 패널에서 별을 고르면 지도를 그 별로 옮긴다(n은 같은 별을 다시 눌러도 움직이게) */
  center: { id: string; n: number } | null;
  centerOn: (id: string) => void;
};

export function MapCanvasSection({
  workId,
  selected,
  onToggle,
  onClear,
  focus,
  expanded = false,
  onExpand,
}: {
  workId: string;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  focus: MapFocus;
  /** 지도 크게 보기 중인지 */
  expanded?: boolean;
  onExpand?: (on: boolean) => void;
}) {
  const { focusId: infoId, setFocusId: setInfoId, linkId, setLinkId, linkFrom, setLinkFrom, linkTo, setLinkTo, center } = focus;
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [view, setView] = useState<MapView>(MAP_HOME);
  const [kinds, setKinds] = useState<Set<ItemKind>>(new Set(KINDS));
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const [dir, setDir] = useState<'both' | 'forward' | 'backward'>('both');
  const [removing, setRemoving] = useState<string | null>(null);

  const items = useMemo(() => (data ? data.items.filter((i) => kinds.has(i.kind)) : []), [data, kinds]);
  const links = useMemo(() => {
    if (!data) return [];
    const ids = new Set(items.map((i) => i.id));
    return data.links.filter((l) => ids.has(l.a) && ids.has(l.b) && (l.kind !== 'co_occur' || l.weight >= limits.mapCoOccurMin));
  }, [data, items]);
  // 크게 보기 간단 정보 카드는 고른 별의 반대쪽(별을 가리지 않게)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cardRight, setCardRight] = useState(false);
  const quickKey = expanded ? (infoId ?? selected[selected.length - 1] ?? '') : '';
  useEffect(() => {
    if (!quickKey) return;
    const box = canvasRef.current?.getBoundingClientRect();
    const st = canvasRef.current?.querySelector(`[data-id="${quickKey}"]`)?.getBoundingClientRect();
    if (box && st) setCardRight(st.left + st.width / 2 - box.left < box.width / 2);
  }, [quickKey, view]);
  useEffect(() => {
    if (center) setView(viewFocusing(items, links, center.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);
  const aiResolve = useMemo(() => (data ? aiResolveEps(data.appearances, data.episodes) : new Map<string, number>()), [data]);
  if (!data) return null;

  const openStar = (id: string) => {
    setLinkId(null);
    setInfoId(id);
  };
  const onStar = (id: string) => {
    if (linkFrom && id !== linkFrom) {
      setLinkTo(id);
      return;
    }
    const deselecting = selected.includes(id);
    onToggle(id);
    // 다시 눌러 빼면 그 별 강조도 끈다
    if (deselecting) {
      setLinkId(null);
      setInfoId(null);
    } else openStar(id);
  };
  /** 처음 상태로: 강조·관계 정보창·연결 추가·고른 별 모두 비우기(빈 곳 누르기, Esc) */
  const reset = () => {
    setLinkFrom(null);
    setLinkTo(null);
    setInfoId(null);
    setLinkId(null);
    onClear();
  };
  const focusStar = (id: string) => {
    setView(viewFocusing(items, links, id));
    openStar(id);
  };

  const find = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const hit = items.find((i) => i.name.includes(q) || i.aliases.some((a) => a.includes(q)));
    if (!hit) return showToast(copy.map.notFound);
    focusStar(hit.id);
  };

  const zoom = (f: number) => setView((v) => ({ k: Math.min(4, Math.max(0.35, v.k * f)), x: v.x * f, y: v.y * f }));
  const relation = linkId ? data.links.find((l) => l.id === linkId) : null;
  const jumpId = infoId && selected.includes(infoId) ? infoId : selected[selected.length - 1];
  const jumpItem = jumpId ? data.itemById.get(jumpId) : null;
  // 크게 보기 간단 정보: 지금 살펴보는 별(검색으로 찾은 별 포함), 없으면 마지막으로 고른 별
  const quick = (infoId ? data.itemById.get(infoId) : null) ?? jumpItem;
  const quickLinks = quick ? linkedOf(data, quick.id) : [];
  const quickRelated = [...new Map(quickLinks.filter((x) => x.other.kind === 'foreshadow').map((x) => [x.other.id, x.other])).values()].slice(0, 3);
  const from = linkFrom ? data.itemById.get(linkFrom) : null;
  const to = linkTo ? data.itemById.get(linkTo) : null;

  const saveLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    // forward: 처음 고른 별 → 두 번째 별, backward: 반대
    const [x, y] = dir === 'backward' ? [to.id, from.id] : [from.id, to.id];
    const ok = await save(workId, () => addManualLink(workId, x, y, label, dir !== 'both'), copy.map.info.linked_ok);
    if (ok) {
      setLinkFrom(null);
      setLinkTo(null);
      setLabel('');
      setDir('both');
    }
  };

  const removeConfirm = (link: LinkRow, aName: string, bName: string) =>
    removing === link.id && (
      <ConfirmBar
        message={copy.map.info.removeLinkConfirm(aName, bName)}
        confirmLabel={copy.map.info.removeYes}
        cancelLabel={copy.map.info.linkCancel}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await save(workId, () => deleteLink(link.id), copy.map.info.removed);
          setRemoving(null);
          if (linkId === link.id) setLinkId(null);
        }}
      />
    );

  // 키보드: Esc 닫기, + − 0 확대·축소(입력칸에서는 글자 입력이 우선)
  const onKeyDown = (e: KeyboardEvent) => {
    const typing = (e.target as HTMLElement).closest('input, textarea, select');
    if (e.key === 'Escape') {
      // 연결 추가 중이면 그것만 취소, 아니면 처음 상태로
      if (linkFrom) {
        setLinkFrom(null);
        setLinkTo(null);
      } else reset();
      return;
    }
    if (typing) return;
    if (e.key === '+' || e.key === '=') zoom(1.25);
    else if (e.key === '-' || e.key === '_') zoom(0.8);
    else if (e.key === '0') setView(MAP_HOME);
    else return;
    e.preventDefault();
  };

  return (
    <div className={expanded ? `${s.wrap} ${s.wrapExpanded}` : s.wrap} onKeyDown={onKeyDown}>
      <div className={s.toolbar}>
        <div className={s.kinds} role="group" aria-label={copy.map.show}>
          {KINDS.map((k) => (
            <label key={k} className={kinds.has(k) ? `${s.kindToggle} ${s.kindOn}` : s.kindToggle}>
              <input
                type="checkbox"
                checked={kinds.has(k)}
                onChange={(e) => {
                  const next = new Set(kinds);
                  if (e.target.checked) next.add(k);
                  else next.delete(k);
                  setKinds(next);
                }}
              />
              <StarShape kind={k} />
              {copy.labels.kind[k]}
            </label>
          ))}
        </div>
        <form className={s.search} onSubmit={find} role="search">
          <TextField label={copy.map.search} hideLabel placeholder={copy.map.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} list="map-names" />
          <datalist id="map-names">
            {items.map((i) => (
              <option key={i.id} value={i.name} />
            ))}
          </datalist>
          <Button type="submit" variant="ghost" size="sm">
            {copy.map.search}
          </Button>
        </form>
        <div className={s.zoom}>
          {onExpand && (
            <Button id="map-expand" variant={expanded ? 'primary' : 'ghost'} size="sm" onClick={() => onExpand(!expanded)} aria-pressed={expanded}>
              {expanded ? copy.map.expand.exit : copy.map.expand.enter}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => zoom(1.25)} aria-label={copy.map.zoomIn}>
            ＋
          </Button>
          <Button variant="ghost" size="sm" onClick={() => zoom(0.8)} aria-label={copy.map.zoomOut}>
            −
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView(MAP_HOME)}>
            {copy.map.reset}
          </Button>
        </div>
      </div>

      <div className={s.canvas} ref={canvasRef}>
        <StarMap
          title={work?.title ?? ''}
          items={items}
          links={links}
          selected={new Set(selected)}
          focusId={infoId}
          onStar={onStar}
          onLink={(id) => {
            setInfoId(null);
            setLinkId(id);
          }}
          onBackground={() => (linkFrom ? undefined : reset())}
          activeLinkId={linkId}
          aiResolve={aiResolve}
          view={view}
          onView={setView}
        />

        {/* 별 두 개를 고르면 지도 위에서 바로 잇기·지우기(오른쪽 창까지 가지 않아도 되게) */}
        {canWrite && !from && !relation && selected.length === 2 && (() => {
          const [a, b] = selected.map((id) => data.itemById.get(id));
          if (!a || !b) return null;
          const between = data.links.filter((l) => l.kind !== 'co_occur' && ((l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id)));
          return (
            <div className={s.linkBar} role="group" aria-label={copy.map.info.pairHint}>
              <span>{copy.map.info.pairTitle(a.name, b.name)}</span>
              <Button size="sm" onClick={() => { setLinkFrom(a.id); setLinkTo(b.id); }}>
                {copy.map.info.pairConnect}
              </Button>
              {between.map((l) => (
                <Button key={l.id} variant="ghost" size="sm" onClick={() => setRemoving(l.id)}>
                  {copy.map.info.pairRemove(l.label ? shortLabel(l.label, limits.mapLinkLabelMax) : null)}
                </Button>
              ))}
              {between.map((l) => <span key={`c-${l.id}`}>{removeConfirm(l, a.name, b.name)}</span>)}
            </div>
          );
        })()}

        {from && (
          <div className={s.linkBar} role="status">
            {to ? (
              <form onSubmit={saveLink} className={s.linkForm}>
                <span>
                  「{from.name}」 — 「{to.name}」
                </span>
                <TextField label={copy.map.info.linkLabel} hideLabel placeholder={copy.map.info.linkLabel} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus maxLength={40} />
                <SelectField
                  label={copy.map.info.direction}
                  hideLabel
                  value={dir}
                  onChange={(e) => setDir(e.target.value as typeof dir)}
                  options={[
                    ['both', copy.map.info.dirBoth],
                    ['forward', copy.map.info.dirForward(from.name, to.name)],
                    ['backward', copy.map.info.dirForward(to.name, from.name)],
                  ]}
                />
                <Button type="submit" size="sm">
                  {copy.map.info.linkSave}
                </Button>
                <span className={s.hint}>{copy.map.info.twoWayHint}</span>
                <Button variant="ghost" size="sm" onClick={() => { setLinkFrom(null); setLinkTo(null); }}>
                  {copy.map.info.linkCancel}
                </Button>
              </form>
            ) : (
              <>
                <span>{copy.map.info.pickTarget(from.name)}</span>
                <Button variant="ghost" size="sm" onClick={() => setLinkFrom(null)}>
                  {copy.map.info.linkCancel}
                </Button>
              </>
            )}
          </div>
        )}

        {/* 관계 정보창(선을 눌렀을 때) */}
        {relation && !from && (() => {
          const a = data.itemById.get(relation.a);
          const b = data.itemById.get(relation.b);
          if (!a || !b) return null;
          const both = episodesOf(data, a.id).filter((n) => episodesOf(data, b.id).includes(n));
          const d = directionFor(relation, a.id);
          return (
            <div className={s.info} role="dialog" aria-label={copy.map.relation.title}>
              <div className={s.infoHead}>
                <strong>{copy.map.relation.title}</strong>
                <button type="button" className={s.close} onClick={() => setLinkId(null)} aria-label={copy.map.info.close}>
                  ×
                </button>
              </div>
              <p className={s.relationPair}>
                <button type="button" className={s.textBtn} onClick={() => focusStar(a.id)} aria-label={copy.map.relation.open(a.name)}>
                  <StarShape kind={a.kind} /> {a.name}
                </button>
                <span aria-hidden="true">{d === 'out' ? '→' : d === 'in' ? '←' : '—'}</span>
                <button type="button" className={s.textBtn} onClick={() => focusStar(b.id)} aria-label={copy.map.relation.open(b.name)}>
                  <StarShape kind={b.kind} /> {b.name}
                </button>
              </p>
              <p>{relationText(relation)}</p>
              <p className={s.muted}>
                {copy.map.relation.kind}: {linkKindText(relation)}
              </p>
              <p className={s.muted}>
                {copy.map.relation.sharedEps}: {both.length ? both.map((n) => `${n}화`).join(', ') : copy.map.info.none}
              </p>
              {relation.evidence ? <EvidenceQuote text={relation.evidence} /> : relation.kind !== 'co_occur' && <p className={s.muted}>{copy.map.relation.noEvidence}</p>}
              {canWrite && relation.kind !== 'co_occur' && (
                <div className={s.infoActions}>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(relation.id)}>
                    {copy.map.info.removeLink}
                  </Button>
                </div>
              )}
              {removeConfirm(relation, a.name, b.name)}
            </div>
          );
        })()}

        {/* 크게 보기: 고른 별의 간단 정보(자세한 내용은 기본 화면 ② 관계 확인) */}
        {expanded && quick && !relation && !from && (
          <div className={cardRight ? `${s.quick} ${s.quickRight}` : s.quick} role="status" aria-live="polite">
            <div className={s.infoHead}>
              <StarShape kind={quick.kind} size={16} />
              <strong>{quick.name}</strong>
              <KindTag kind={quick.kind} />
            </div>
            <div className={s.stateRow}>
              {(quick.kind === 'foreshadow' || quick.status === 'reuse_planned') && <StatusTag status={quick.status} />}
              {quick.gap != null && <GapTag gap={quick.gap} />}
              {isUnconfirmedAi(quick) && <AiBadge />}
            </div>
            {quick.note && <p className={s.quickNote}>{quick.note}</p>}
            <p className={s.muted}>
              {copy.map.expand.links(quickLinks.length)}
              {quickRelated.length > 0 && ` · ${copy.map.info.relatedForeshadow}: ${quickRelated.map((f) => f.name).join(', ')}`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onExpand?.(false);
                window.setTimeout(() => {
                  const el = document.getElementById('step2');
                  el?.scrollIntoView({ block: 'start' });
                  el?.focus({ preventScroll: true });
                }, 50);
              }}
            >
              {copy.map.expand.more}
            </Button>
          </div>
        )}
      </div>

      {/* 휴대폰·좁은 화면: 별을 고르면 아래 설명(② 관계 확인)으로 바로 가는 띠 */}
      {jumpItem && !expanded && (
        <button
          type="button"
          className={s.jumpBar}
          onClick={() => {
            const el = document.getElementById('step2');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el?.focus({ preventScroll: true });
          }}
        >
          {copy.map.panel.jump(jumpItem.name)}
        </button>
      )}
      <div className={s.legend}>
        <span className={s.legendGroup}>
          {KINDS.map((k) => (
            <span key={k}>
              <StarShape kind={k} /> {copy.labels.kind[k]}
            </span>
          ))}
        </span>
        <span>
          <i className={s.lCo} /> {copy.map.legendCo}
        </span>
        <span>
          <i className={s.lAi} /> {copy.map.legendAi}
        </span>
        <span>
          <i className={s.lManual} /> {copy.map.legendManual}
        </span>
      </div>
      <details className={s.legendMore} hidden={expanded}>
        <summary>{copy.map.legend.shapes}</summary>
        <ul>
          <li>{copy.map.legend.size}</li>
          <li>{copy.map.legend.forgotten(FORGOTTEN_GAP)}</li>
          <li>{copy.map.legend.done}</li>
          <li>{copy.map.legend.planned}</li>
          <li>{copy.map.legend.aiResolve}</li>
          <li>{copy.map.legend.lines}</li>
          <li>{copy.map.weakLinks(limits.mapCoOccurMin)}</li>
          <li>{copy.map.legend.zoom}</li>
          <li>{copy.map.legend.reset}</li>
          <li>{copy.map.legend.expand}</li>
          <li>{copy.map.legend.keys}</li>
        </ul>
      </details>
    </div>
  );
}
