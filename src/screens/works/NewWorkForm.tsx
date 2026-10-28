import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { copy } from '../../config/copy';
import { createWork } from '../../data/works';
import type { Work } from '../../data/types';
import s from './WorksScreen.module.css';

/** 새 작품 만들기: 제목·장르(BUILD_SPEC 6.2). */
export function NewWorkForm({ onCreated, onCancel }: { onCreated: (work: Work) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(copy.works.titleRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onCreated(await createWork({ title, genre }));
    } catch {
      setError(copy.works.saveError);
      setBusy(false);
    }
  };

  return (
    <form className={s.form} onSubmit={submit}>
      <div className={s.formFields}>
        <TextField label={copy.works.titleLabel} placeholder={copy.works.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
        <TextField label={copy.works.genreLabel} placeholder={copy.works.genrePlaceholder} value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={30} />
      </div>
      {error && <p className={s.formError} role="alert">{error}</p>}
      <div className={s.formActions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {copy.works.cancel}
        </Button>
        <Button type="submit" loading={busy}>
          {copy.works.create}
        </Button>
      </div>
    </form>
  );
}
