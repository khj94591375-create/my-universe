import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { AiBadge, Chip, KindTag, StatusTag } from '../../../components/Badges';
import { SelectField, TextArea, TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { addAlias, deleteItem, mergeItems, removeAlias, updateItem } from '../../../data/items';
import type { ItemKind, ItemStatus, ItemView } from '../../../data/types';
import { recomputeCoOccur } from '../../../features/analysis/runRules';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import { kindOptions } from './NewItemSection';
import { SheetImage } from './SheetImage';
import s from './bible.module.css';

const statusOptions: [ItemStatus, string][] = (['open', 'resolved', 'reuse_planned', 'reused'] as ItemStatus[]).map((st) => [st, copy.labels.status[st]]);

type Mode = 'view' | 'edit' | 'merge' | 'confirmMerge' | 'confirmDelete';

/** 설정집 한 줄: 보기 / 고치기 / 합치기 / 삭제. 예시 작품에서는 보기만. */
export function ItemRow({ workId, item }: { workId: string; item: ItemView }) {
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const { data } = useWorkData(workId);
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState({ name: item.name, kind: item.kind, note: item.note ?? '', look: item.look ?? '', status: item.status });
  const [alias, setAlias] = useState('');
  const [mergeId, setMergeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft({ name: item.name, kind: item.kind, note: item.note ?? '', look: item.look ?? '', status: item.status });
    setError(null);
    setMode('edit');
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return setError(copy.bible.nameRequired);
    if (data?.items.some((i) => i.id !== item.id && i.name === draft.name.trim())) return setError(copy.bible.duplicate);
    setBusy(true);
    const ok = await save(workId, () => updateItem(item.id, { ...draft, note: draft.note || null, look: draft.look || null }));
    setBusy(false);
    if (ok) setMode('view');
  };

  const submitAlias = async (e: FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) return;
    if (await save(workId, () => addAlias(item.id, alias))) setAlias('');
  };

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    await save(workId, fn, done);
    setBusy(false);
    setMode('view');
  };

  const others = data ? data.items.filter((i) => i.id !== item.id).sort((x, y) => x.name.localeCompare(y.name)) : [];
  const drop = others.find((i) => i.id === mergeId);

  if (mode === 'edit') {
    return (
      <li className={s.row}>
        <form className={s.form} onSubmit={submitEdit}>
          <div className={s.formRow}>
            <TextField label={copy.bible.name} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} autoFocus />
            <SelectField label={copy.bible.kind} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ItemKind })} options={kindOptions} />
            <SelectField label={copy.bible.status} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ItemStatus })} options={statusOptions} />
          </div>
          <TextArea label={copy.bible.note} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={2} />
          <TextArea label={copy.bible.look} value={draft.look} onChange={(e) => setDraft({ ...draft, look: e.target.value })} rows={2} />
          {error && <p className={s.error} role="alert">{error}</p>}
          <div className={s.formActions}>
            <Button variant="ghost" onClick={() => setMode('view')} disabled={busy}>
              {copy.bible.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {copy.bible.save}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={s.row}>
      <div className={s.head}>
        <strong className={s.name}>{item.name}</strong>
        <KindTag kind={item.kind} />
        {item.kind === 'foreshadow' && <StatusTag status={item.status} />}
        {(item.source === 'ai' || !item.confirmed) && <AiBadge />}
        <span className={s.muted}>
          {copy.bible.appears} {item.first_ep != null && item.last_ep != null ? copy.labels.epRange(item.first_ep, item.last_ep) : copy.labels.noAppearance}
          {' · '}
          {copy.bible.source} {copy.labels.source[item.source]}
        </span>
      </div>
      {item.note && <p>{item.note}</p>}
      {item.look && (
        <p className={s.muted}>
          {copy.bible.look}: {item.look}
        </p>
      )}
      <SheetImage workId={workId} item={item} canWrite={canWrite} />
      <div className={s.aliases}>
        <span className={s.muted}>{copy.bible.aliases}</span>
        {item.aliases.map((a) => (
          <Chip key={a} onRemove={canWrite ? () => save(workId, () => removeAlias(item.id, a)) : undefined}>
            {a}
          </Chip>
        ))}
        {canWrite && (
          <form onSubmit={submitAlias} className={s.aliasForm}>
            <TextField label={copy.bible.addAlias} hideLabel placeholder={copy.bible.aliasPlaceholder} value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={40} />
            <Button type="submit" variant="ghost" size="sm">
              {copy.bible.addAlias}
            </Button>
          </form>
        )}
      </div>

      {mode === 'merge' && (
        <div className={s.formRow}>
          <SelectField
            label={copy.bible.mergeLabel}
            value={mergeId}
            onChange={(e) => setMergeId(e.target.value)}
            options={[['', copy.bible.mergePick], ...others.map((o) => [o.id, `${o.name} (${copy.labels.kind[o.kind]})`] as [string, string])]}
          />
          <div className={s.formActions}>
            <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
              {copy.bible.cancel}
            </Button>
            <Button size="sm" disabled={!drop} onClick={() => setMode('confirmMerge')}>
              {copy.bible.mergeYes}
            </Button>
          </div>
        </div>
      )}
      {mode === 'confirmMerge' && drop && (
        <ConfirmBar
          message={copy.bible.mergeConfirm(item.name, drop.name)}
          confirmLabel={copy.bible.mergeYes}
          cancelLabel={copy.bible.cancel}
          danger={false}
          busy={busy}
          onCancel={() => setMode('view')}
          onConfirm={() =>
            run(async () => {
              await mergeItems(item.id, drop.id);
              await recomputeCoOccur(workId);
            }, copy.bible.merged)
          }
        />
      )}
      {mode === 'confirmDelete' && (
        <ConfirmBar
          message={copy.bible.removeConfirm(item.name)}
          confirmLabel={copy.bible.remove}
          cancelLabel={copy.bible.cancel}
          busy={busy}
          onCancel={() => setMode('view')}
          onConfirm={() =>
            run(async () => {
              await deleteItem(item.id);
              await recomputeCoOccur(workId);
            }, copy.toast.deleted)
          }
        />
      )}
      {canWrite && mode === 'view' && (
        <div className={s.rowActions}>
          <Button variant="ghost" size="sm" onClick={startEdit}>
            {copy.bible.edit}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMergeId(''); setMode('merge'); }}>
            {copy.bible.merge}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode('confirmDelete')}>
            {copy.bible.remove}
          </Button>
        </div>
      )}
    </li>
  );
}
