import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink } from '../../components/Button';
import { ConfirmBar } from '../../components/ConfirmBar';
import { TextField } from '../../components/TextField';
import { copy } from '../../config/copy';
import { deleteWork, renameWork } from '../../data/works';
import type { WorkWithStats } from '../../data/types';
import { forgetWork } from '../../features/works/useWork';
import { BookCover } from './BookCover';
import s from './WorksScreen.module.css';

const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * 책 모양 작품 카드: 표지 · 작품명 · 장르·회차 · 최근 작업 · [이어서 작업] · 더보기(이름 바꾸기 · 삭제).
 * 삭제는 지워지는 범위를 보여 주는 확인 단계를 거친다.
 */
export function WorkCard({ work, onChanged, onDeleted }: { work: WorkWithStats; onChanged?: (title: string) => void; onDeleted?: () => void }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'confirmDelete'>('view');
  const [menu, setMenu] = useState(false);
  const [title, setTitle] = useState(work.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const editable = !work.is_sample && onChanged && onDeleted;

  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [menu]);

  const saveTitle = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(copy.works.titleRequired);
    setBusy(true);
    setError(null);
    try {
      await renameWork(work.id, title);
      forgetWork(work.id);
      onChanged?.(title.trim());
      setMode('view');
    } catch {
      setError(copy.works.saveError);
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteWork(work.id);
      forgetWork(work.id);
      onDeleted?.();
    } catch {
      setError(copy.works.saveError);
      setBusy(false);
    }
  };

  const meta = [work.genre, copy.works.episodes(work.episode_count), copy.works.openForeshadows(work.open_foreshadow_count)].filter(Boolean);
  const when = work.last_upload_at ? copy.works.recent(dateFmt.format(new Date(work.last_upload_at))) : copy.works.noUpload;

  return (
    <article className={s.book}>
      <Link to={`/w/${work.id}/home`} className={s.coverLink} tabIndex={-1} aria-hidden="true">
        <BookCover title={work.title} genre={work.genre} />
      </Link>
      <div className={s.bookBody}>
        {mode === 'rename' ? (
          <form className={s.renameRow} onSubmit={saveTitle}>
            <TextField label={copy.works.titleLabel} hideLabel value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
            <div className={s.renameActions}>
              <Button variant="ghost" size="sm" onClick={() => { setMode('view'); setTitle(work.title); setError(null); }} disabled={busy}>
                {copy.works.cancel}
              </Button>
              <Button type="submit" size="sm" loading={busy}>
                {copy.works.save}
              </Button>
            </div>
          </form>
        ) : (
          <div className={s.bookHead}>
            <h2 className={s.cardTitle}>
              <Link to={`/w/${work.id}/home`} className={s.titleLink}>
                {work.title}
              </Link>
            </h2>
            {editable && (
              <div className={s.more} ref={menuRef}>
                <button ref={menuBtn} type="button" className={s.moreBtn} aria-haspopup="true" aria-expanded={menu} aria-label={copy.works.more(work.title)} onClick={() => setMenu(!menu)}>
                  ⋯
                </button>
                {menu && (
                  <ul className={s.moreMenu}>
                    <li>
                      <button type="button" onClick={() => { setMenu(false); setMode('rename'); }}>
                        {copy.works.rename}
                      </button>
                    </li>
                    <li>
                      <button type="button" className={s.danger} onClick={() => { setMenu(false); setMode('confirmDelete'); }}>
                        {copy.works.remove}
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <p className={s.meta}>{meta.join(' · ')}</p>
        <p className={s.meta}>{when}</p>
        {error && (
          <p className={s.formError} role="alert">
            {error}
          </p>
        )}
        {mode === 'confirmDelete' ? (
          <ConfirmBar message={copy.works.removeConfirm(work.title)} confirmLabel={copy.works.removeYes} cancelLabel={copy.works.cancel} onConfirm={remove} onCancel={() => setMode('view')} busy={busy} />
        ) : (
          mode === 'view' && (
            <ButtonLink to={`/w/${work.id}/home`} variant="ghost" size="sm" className={s.continue}>
              {copy.works.continue}
            </ButtonLink>
          )
        )}
      </div>
    </article>
  );
}

/** 예시 작품: 작은 표지 + 한 줄 설명 + [예시 열어 보기] */
export function SampleRow({ work }: { work: WorkWithStats }) {
  return (
    <div className={s.sampleRow}>
      <BookCover title={work.title} genre={work.genre} small />
      <div className={s.sampleText}>
        <h3>
          {work.title}
        </h3>
        <p className={s.meta}>{copy.works.sampleBlurb}</p>
      </div>
      <ButtonLink to={`/w/${work.id}/home`} variant="ghost" size="sm">
        {copy.works.sampleOpen}
      </ButtonLink>
    </div>
  );
}
