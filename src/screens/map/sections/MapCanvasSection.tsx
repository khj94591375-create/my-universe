import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { MAP_HOME, StarMap, viewFocusing, type MapView } from '../../../components/StarMap';
import { StarShape } from '../../../components/StarShape';
import { SelectField, TextField } from '../../../components/TextField';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { AiBadge, EvidenceQuote, GapTag, KindTag, StatusTag } from '../../../components/Badges';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { addManualLink, deleteLink, setItemStatus } from '../../../data/items';
import { directionFor } from '../../../features/map/links';
import { aiResolveEps, FORGOTTEN_GAP } from '../../../features/map/stars';
import type { ItemKind, Link as LinkRow } from '../../../data/types';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];

/**
 * 지도 + 도구 막대(종류별 보기, 이름 찾기, 확대·축소) + 별 정보창 + 관계 정보창 + 연결 추가.
 * 지도에는 실제 기록된 항목과 관계만 그린다(임의로 잇지 않는다).
 */
export function MapCanvasSection({ workId, selected, onToggle }: { workId: string; selected: string[]; onToggle: (id: string) => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [view, setView] = useState<MapView>(MAP_HOME);
  const [kinds, setKinds] = useState<Set<ItemKind>>(new Set(KINDS));
  const [query, setQuery] = useState('');
  const [infoId, setInfoId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkTo, setLinkTo] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [dir, setDir] = useState<'both' | 'forward' | 'backward'>('both');
  const [removing, setRemoving] = useState<string | null>(null);

  const items = useMemo(() => (data ? data.items.filter((i) => kinds.has(i.kind)) : []), [data, kinds]);
  const links = useMemo(() => {
    if (!data) return [];
    const ids = new Set(items.map((i) => i.id));
    return data.links.filter((l) => ids.has(l.a) && ids.has(l.b) && (l.kind !== 'co_occur' || l.weight >= limits.mapCoOccurMin));
  }, [data, items]);
  const aiResolve = useMemo(() => (data ? aiResolveEps(data.appearances, data.episodes) : new Map<string, number>()), [data]);
  if (!data) return null;

  const epNo = (id: string) => data.episodes.find((e) => e.id === id)?.no;
  const episodesOf = (itemId: string) =>
    [...new Set(data.appearances.filter((a) => a.item_id === itemId).map((a) => epNo(a.episode_id)))].filter((n): n is number => n != null).sort((a, b) => a - b);

  const openStar = (id: string) => {
    setLinkId(null);
    setInfoId(id);
  };
  const onStar = (id: string) => {
    if (linkFrom && id !== linkFrom) {
      setLinkTo(id);
      return;
    }
    onToggle(id);
    openStar(id);
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
  const info = infoId ? data.itemById.get(infoId) : null;
  const relation = linkId ? data.links.find((l) => l.id === linkId) : null;
  // 연결된 항목과 관계 이름(같은 장면 연결선은 이름이 없어 "같은 장면 N번")
  const linkedOf = (id: string) =>
    data.links
      .filter((l) => l.a === id || l.b === id)
      .map((l) => ({ link: l, other: data.itemById.get(l.a === id ? l.b : l.a) }))
      .filter((x): x is { link: LinkRow; other: NonNullable<typeof x.other> } => Boolean(x.other));
  const linked = info ? linkedOf(info.id) : [];
  const relatedForeshadow = info ? [...new Map(linked.filter((x) => x.other.kind === 'foreshadow').map((x) => [x.other.id, x.other])).values()] : [];
  const epNos = info ? episodesOf(info.id) : [];
  const aiEp = info && info.kind === 'foreshadow' && info.status === 'open' ? aiResolve.get(info.id) ?? null : null;
  const from = linkFrom ? data.itemById.get(linkFrom) : null;
  const to = linkTo ? data.itemById.get(linkTo) : null;
  const linkKindText = (l: LinkRow) => (l.kind === 'ai' ? copy.labels.ai : l.kind === 'manual' ? copy.map.legendManual : copy.map.info.autoLink);

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
      setLinkFrom(null);
      setLinkTo(null);
      setInfoId(null);
      setLinkId(null);
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
    <div className={s.wrap} onKeyDown={onKeyDown}>
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

      <div className={s.canvas}>
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
          activeLinkId={linkId}
          aiResolve={aiResolve}
          view={view}
          onView={setView}
        />

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

        {/* 별 정보창 */}
        {info && !from && (
          <div className={s.info} role="dialog" aria-label={info.name}>
            <div className={s.infoHead}>
              <StarShape kind={info.kind} size={16} />
              <strong>{info.name}</strong>
              <KindTag kind={info.kind} />
              <button type="button" className={s.close} onClick={() => setInfoId(null)} aria-label={copy.map.info.close}>
                ×
              </button>
            </div>
            {info.note && <p>{info.note}</p>}
            <div className={s.stateRow}>
              {(info.kind === 'foreshadow' || info.status === 'reuse_planned') && <StatusTag status={info.status} />}
              {info.gap != null && <GapTag gap={info.gap} />}
              {(info.source === 'ai' || !info.confirmed) && <AiBadge />}
            </div>
            {info.kind === 'foreshadow' && <p className={s.muted}>{copy.map.info.byAuthor}</p>}
            {(info.source === 'ai' || !info.confirmed) && <p className={s.note}>{copy.map.info.aiItem}</p>}
            {aiEp != null && (
              <div className={s.note}>
                <p>{copy.map.info.aiResolveNote(aiEp)}</p>
                <div className={s.infoActions}>
                  {canWrite && (
                    <Button size="sm" onClick={() => save(workId, () => setItemStatus(info.id, 'resolved'))}>
                      {copy.map.info.markResolved}
                    </Button>
                  )}
                  <Link to={`/w/${workId}/review`}>{copy.map.info.toReview}</Link>
                </div>
              </div>
            )}
            <p className={s.muted}>
              {copy.map.info.appears}: {epNos.length ? epNos.map((n) => `${n}화`).join(', ') : copy.map.info.none}
            </p>
            {info.kind !== 'foreshadow' && (
              <div className={s.muted}>
                {copy.map.info.relatedForeshadow}: {relatedForeshadow.length === 0 && copy.map.info.none}
                {relatedForeshadow.length > 0 && (
                  <span className={s.chips}>
                    {relatedForeshadow.map((f) => (
                      <button key={f.id} type="button" className={s.textBtn} onClick={() => focusStar(f.id)}>
                        <StarShape kind="foreshadow" size={12} /> {f.name}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            )}
            <div className={s.muted}>
              {copy.map.info.linked}: {linked.length === 0 && copy.map.info.none}
              {linked.length > 0 && (
                <ul className={s.linkedList}>
                  {linked.map(({ link, other }) => {
                    const d = directionFor(link, info.id);
                    return (
                      <li key={link.id} className={s.linkedItem}>
                        <button type="button" className={s.textBtn} onClick={() => setLinkId(link.id)} aria-label={copy.map.info.openRelation(other.name)}>
                          <span className={s.dir} aria-hidden="true">{d === 'out' ? '→' : d === 'in' ? '←' : '—'}</span>
                          <strong>{other.name}</strong> · {link.label ?? (link.kind === 'co_occur' ? copy.map.info.coTimes(link.weight) : copy.map.info.noLabel)}
                          <span className={s.linkKind}> ({linkKindText(link)})</span>
                        </button>
                        {canWrite && link.kind !== 'co_occur' && (
                          <button type="button" className={s.removeLink} onClick={() => setRemoving(link.id)} aria-label={`${other.name} ${copy.map.info.removeLink}`}>
                            ×
                          </button>
                        )}
                        {removeConfirm(link, info.name, other.name)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={s.infoActions}>
              <Button variant={selected.includes(info.id) ? 'ghost' : 'primary'} size="sm" onClick={() => onToggle(info.id)}>
                {selected.includes(info.id) ? copy.map.info.removeFromPlan : copy.map.info.addToPlan}
              </Button>
              <Link to={`/w/${workId}/bible?item=${info.id}`}>{copy.map.info.toBible}</Link>
              <Link to={`/w/${workId}/forgot?item=${info.id}`}>{copy.map.info.guide}</Link>
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={() => setLinkFrom(info.id)}>
                  {copy.map.info.addLink}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 관계 정보창(선을 눌렀을 때) */}
        {relation && !info && !from && (() => {
          const a = data.itemById.get(relation.a);
          const b = data.itemById.get(relation.b);
          if (!a || !b) return null;
          const both = episodesOf(a.id).filter((n) => episodesOf(b.id).includes(n));
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
                <button type="button" className={s.textBtn} onClick={() => openStar(a.id)} aria-label={copy.map.relation.open(a.name)}>
                  <StarShape kind={a.kind} /> {a.name}
                </button>
                <span aria-hidden="true">{d === 'out' ? '→' : d === 'in' ? '←' : '—'}</span>
                <button type="button" className={s.textBtn} onClick={() => openStar(b.id)} aria-label={copy.map.relation.open(b.name)}>
                  <StarShape kind={b.kind} /> {b.name}
                </button>
              </p>
              <p>{relation.label ?? (relation.kind === 'co_occur' ? copy.map.info.coTimes(relation.weight) : copy.map.info.noLabel)}</p>
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
      </div>

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
      <details className={s.legendMore}>
        <summary>{copy.map.legend.shapes}</summary>
        <ul>
          <li>{copy.map.legend.size}</li>
          <li>{copy.map.legend.forgotten(FORGOTTEN_GAP)}</li>
          <li>{copy.map.legend.done}</li>
          <li>{copy.map.legend.planned}</li>
          <li>{copy.map.legend.aiResolve}</li>
          <li>{copy.map.legend.lines}</li>
          <li>{copy.map.weakLinks(limits.mapCoOccurMin)}</li>
          <li>{copy.map.legend.keys}</li>
        </ul>
      </details>
    </div>
  );
}
