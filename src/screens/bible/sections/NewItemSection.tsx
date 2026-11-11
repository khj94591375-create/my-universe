import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { SelectField, TextArea, TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { createItem } from '../../../data/items';
import type { ItemKind } from '../../../data/types';
import { save } from '../../../features/works/save';
import { researchItem } from '../../../features/analysis/runRules';
import { showToast } from '../../../components/Toast';
import { useWorkData } from '../../../features/works/workData';
import s from './bible.module.css';

export const kindOptions: [ItemKind, string][] = [
  ['character', copy.labels.kind.character],
  ['setting', copy.labels.kind.setting],
  ['foreshadow', copy.labels.kind.foreshadow],
];

/** 새 항목 추가: 종류, 이름, 설명. */
export function NewItemSection({ workId, onClose }: { workId: string; onClose: () => void }) {
  const { data } = useWorkData(workId);
  const [kind, setKind] = useState<ItemKind>('character');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(copy.bible.nameRequired);
    if (data?.items.some((i) => i.name === name.trim())) return setError(copy.bible.duplicate);
    setBusy(true);
    // 넣은 뒤 이미 올린 원고에서 그 이름을 바로 찾는다(원고가 있을 때만 알림을 바꿈)
    const hasEpisodes = Boolean(data?.episodes.length);
    let msg: string = copy.toast.saved;
    const ok = await save(
      workId,
      async () => {
        const created = await createItem(workId, { kind, name, note });
        if (hasEpisodes) msg = copy.bible.researched(created.name, await researchItem(workId, { id: created.id, name: created.name, aliases: [] }));
      },
      '',
    );
    if (ok) showToast(msg);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Card title={copy.bible.addTitle}>
      <form className={s.form} onSubmit={submit}>
        <div className={s.formRow}>
          <SelectField label={copy.bible.kind} value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} options={kindOptions} />
          <TextField label={copy.bible.name} value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={60} />
        </div>
        <p className={s.muted}>{copy.labels.kindHelp[kind]}</p>
        <TextArea label={copy.bible.note} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        {error && <p className={s.error} role="alert">{error}</p>}
        <div className={s.formActions}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {copy.bible.cancel}
          </Button>
          <Button type="submit" loading={busy}>
            {copy.bible.add}
          </Button>
        </div>
      </form>
    </Card>
  );
}
