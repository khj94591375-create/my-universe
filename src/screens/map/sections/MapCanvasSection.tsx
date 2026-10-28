import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { MAP_HOME, StarMap, viewFocusing, type MapView } from '../../../components/StarMap';
import { SelectField, TextField } from '../../../components/TextField';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { KindTag } from '../../../components/Badges';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { addManualLink, deleteLink } from '../../../data/items';
import { directionFor } from '../../../features/map/links';
import type { ItemKind, Link as LinkRow } from '../../../data/types';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];

/** 지도 + 도구 막대(종류별 보기, 이름 찾기, 확대·축소) + 별 정보창 + 연결 추가. */
export function MapCanvasSection({ workId, selected, onToggle }: { workId: string; selected: string[]; onToggle: (id: string) => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [view, setView] = useState<MapView>(MAP_HOME);
  const [kinds, setKinds] = useState<Set<ItemKind>>(new Set(KINDS));
  const [query, setQuery] = useState('');
  const [infoId, setInfoId] = useState<string | null>(null);
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
  if (!data) return null;

  const onStar = (id: string) => {
    if (linkFrom && id !== linkFrom) {
      setLinkTo(id);
      return;
    }
    onToggle(id);
    setInfoId(id);
  };

  const find = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const hit = items.find((i) => i.name.includes(q) || i.aliases.some((a) => a.includes(q)));
    if (!q) return;
    if (!hit) return showToast(copy.map.notFound);
    setView(viewFocusing(items, links, hit.id));
    setInfoId(hit.id);
  };

  const zoom = (f: number) => setView((v) => ({ k: Math.min(4, Math.max(0.35, v.k * f)), x: v.x * f, y: v.y * f }));
  const info = infoId ? data.itemById.get(infoId) : null;
  // 연결된 항목과 관계 이름(같은 장면 연결선은 이름이 없어 "같은 장면 N번")
  const linked = info
    ? data.links
        .filter((l) => l.a === info.id || l.b === info.id)
        .map((l) => ({ link: l, other: data.itemById.get(l.a === info.id ? l.b : l.a) }))
        .filter((x): x is { link: LinkRow; other: NonNullable<typeof x.other> } => Boolean(x.other))
    : [];
  const epNos = info ? [...new Set(data.appearances.filter((a) => a.item_id === info.id).map((a) => data.episodes.find((e) => e.id === a.episode_id)?.no))].filter((n): n is number => n != null).sort((a, b) => a - b) : [];
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

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        <div className={s.kinds} role="group" aria-label={copy.map.show}>
          {KINDS.map((k) => (
            <label key={k} className={s.kindToggle}>
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
        <StarMap title={work?.title ?? ''} items={items} links={links} selected={new Set(selected)} focusId={infoId} onStar={onStar} view={view} onView={setView} />

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

        {info && !from && (
          <div className={s.info} role="dialog" aria-label={info.name}>
            <div className={s.infoHead}>
              <strong>{info.name}</strong>
              <KindTag kind={info.kind} />
              <button type="button" className={s.close} onClick={() => setInfoId(null)} aria-label={copy.map.info.close}>
                ×
              </button>
            </div>
            {info.note && <p>{info.note}</p>}
            <p className={s.muted}>
              {copy.map.info.appears}: {epNos.length ? epNos.map((n) => `${n}화`).join(', ') : copy.map.info.none}
            </p>
            <div className={s.muted}>
              {copy.map.info.linked}: {linked.length === 0 && copy.map.info.none}
              {linked.length > 0 && (
                <ul className={s.linkedList}>
                  {linked.map(({ link, other }) => {
                    const d = directionFor(link, info.id);
                    return (
                      <li key={link.id} className={s.linkedItem}>
                        <span>
                          <span className={s.dir} aria-hidden="true">{d === 'out' ? '→' : d === 'in' ? '←' : '—'}</span>
                          <strong>{other.name}</strong> · {link.label ?? (link.kind === 'co_occur' ? copy.map.info.coTimes(link.weight) : copy.map.info.noLabel)}
                          <span className={s.linkKind}>
                            {' '}
                            ({link.kind === 'ai' ? copy.labels.ai : link.kind === 'manual' ? copy.map.legendManual : copy.map.info.autoLink})
                          </span>
                        </span>
                        {canWrite && link.kind !== 'co_occur' && (
                          <button type="button" className={s.removeLink} onClick={() => setRemoving(link.id)} aria-label={`${other.name} ${copy.map.info.removeLink}`}>
                            ×
                          </button>
                        )}
                        {removing === link.id && (
                          <ConfirmBar
                            message={copy.map.info.removeLinkConfirm(info.name, other.name)}
                            confirmLabel={copy.map.info.removeYes}
                            cancelLabel={copy.map.info.linkCancel}
                            onCancel={() => setRemoving(null)}
                            onConfirm={async () => {
                              await save(workId, () => deleteLink(link.id), copy.map.info.removed);
                              setRemoving(null);
                            }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={s.infoActions}>
              <Link to={`/w/${workId}/forgot?item=${info.id}`}>{copy.map.info.guide}</Link>
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={() => setLinkFrom(info.id)}>
                  {copy.map.info.addLink}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={s.legend}>
        <span>
          <i className={s.lCo} /> {copy.map.legendCo}
        </span>
        <span>
          <i className={s.lAi} /> {copy.map.legendAi}
        </span>
        <span>
          <i className={s.lManual} /> {copy.map.legendManual}
        </span>
        <span className={s.muted}>{copy.map.weakLinks(limits.mapCoOccurMin)}</span>
      </div>
    </div>
  );
}
