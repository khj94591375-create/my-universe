import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmBar } from '../../components/ConfirmBar';
import { Tag } from '../../components/Tag';
import { TextField } from '../../components/TextField';
import { copy } from '../../config/copy';
import { deleteWork, renameWork } from '../../data/works';
import type { WorkWithStats } from '../../data/types';
import { forgetWork } from '../../features/works/useWork';
import s from './WorksScreen.module.css';

const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

/** 작품 카드: 제목, 장르, 연재 회차 수, 미회수 복선 수, 마지막 업로드 + (내 작품이면) 이름 바꾸기·삭제. */
export function WorkCard({ work, onChanged, onDeleted }: { work: WorkWithStats; onChanged?: (title: string) => void; onDeleted?: () => void }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'confirmDelete'>('view');
  const [title, setTitle] = useState(work.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = !work.is_sample && onChanged && onDeleted;

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

  const meta = [
    work.genre,
    copy.works.episodes(work.episode_count),
    copy.works.openForeshadows(work.open_foreshadow_count),
    work.last_upload_at ? copy.works.lastUpload(dateFmt.format(new Date(work.last_upload_at))) : copy.works.noUpload,
  ].filter(Boolean);

  return (
    <Card as="article" className={s.card} tone={work.is_sample ? 'highlight' : 'default'}>
      {mode === 'rename' ? (
        <form className={s.renameRow} onSubmit={saveTitle}>
          <TextField label={copy.works.titleLabel} hideLabel value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
          <Button variant="ghost" size="sm" onClick={() => { setMode('view'); setTitle(work.title); setError(null); }} disabled={busy}>
            {copy.works.cancel}
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            {copy.works.save}
          </Button>
        </form>
      ) : (
        <div className={s.cardTop}>
          <h3>
            <Link to={`/w/${work.id}/home`} className={s.titleLink}>
              {work.title}
            </Link>
          </h3>
          {work.is_sample && <Tag tone="gold">{copy.works.sampleLabel}</Tag>}
        </div>
      )}
      <p className={s.meta}>{meta.join(' · ')}</p>
      {error && <p className={s.formError} role="alert">{error}</p>}
      {mode === 'confirmDelete' ? (
        <ConfirmBar
          message={copy.works.removeConfirm(work.title)}
          confirmLabel={copy.works.removeYes}
          cancelLabel={copy.works.cancel}
          onConfirm={remove}
          onCancel={() => setMode('view')}
          busy={busy}
        />
      ) : (
        mode === 'view' && (
          <div className={s.cardActions}>
            <Link to={`/w/${work.id}/home`} className={s.openLink}>
              {copy.works.open} →
            </Link>
            {editable && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setMode('rename')}>
                  {copy.works.rename}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode('confirmDelete')}>
                  {copy.works.remove}
                </Button>
              </>
            )}
          </div>
        )
      )}
    </Card>
  );
}
