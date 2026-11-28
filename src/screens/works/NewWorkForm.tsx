import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { copy } from '../../config/copy';
import { createWork } from '../../data/works';
import type { Work } from '../../data/types';
import s from './WorksScreen.module.css';

/**
 * 새 작품 만들기 대화상자: 제목·장르(BUILD_SPEC 6.2). Esc·바깥·취소로 닫고, 닫히면 여는 버튼으로 초점이 돌아간다.
 * 만들면 onCreated(작업실로 이동은 부르는 쪽이).
 */
export function NewWorkForm({ onCreated, onCancel }: { onCreated: (work: Work) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = useRef<Element | null>(null);

  useEffect(() => {
    back.current = document.activeElement;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      if (back.current instanceof HTMLElement) back.current.focus();
    };
  }, [onCancel]);

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
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="new-work-title" onSubmit={submit}>
        <h2 id="new-work-title">{copy.works.newTitle}</h2>
        <p className={s.meta}>{copy.works.newHint}</p>
        <TextField label={copy.works.titleLabel} placeholder={copy.works.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
        <TextField label={copy.works.genreLabel} placeholder={copy.works.genrePlaceholder} value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={30} />
        {error && (
          <p className={s.formError} role="alert">
            {error}
          </p>
        )}
        <div className={s.formActions}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {copy.works.cancel}
          </Button>
          <Button type="submit" loading={busy}>
            {copy.works.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
