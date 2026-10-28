import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { SHEET_MAX_BYTES, SHEET_TYPES, removeSheet, signedImageUrl, uploadSheet } from '../../../data/images';
import type { ItemView } from '../../../data/types';
import { save } from '../../../features/works/save';
import s from './bible.module.css';

/** 항목의 이미지 시트: 썸네일 + 올리기·바꾸기·빼기(내 작품일 때만). */
export function SheetImage({ workId, item, canWrite }: { workId: string; item: ItemView; canWrite: boolean }) {
  const path = item.reference_image_path;
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path) signedImageUrl(path).then((u) => alive && setUrl(u), () => undefined);
    return () => {
      alive = false;
    };
  }, [path]);

  if (!path && !canWrite) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!SHEET_TYPES[file.type]) return showToast(copy.bible.sheetType, 'error');
    if (file.size > SHEET_MAX_BYTES) return showToast(copy.bible.sheetSize, 'error');
    setBusy(true);
    await save(workId, () => uploadSheet(workId, item.id, file, path), copy.bible.sheetSaved);
    setBusy(false);
  };

  return (
    <div className={s.sheet}>
      {path && (url ? <img src={url} alt={copy.bible.sheetAlt(item.name)} className={s.thumb} /> : <span className={s.thumbEmpty} aria-hidden="true" />)}
      {canWrite && (
        <div className={s.sheetActions}>
          <Button variant="ghost" size="sm" loading={busy} onClick={() => input.current?.click()}>
            {path ? copy.bible.sheetReplace : copy.bible.sheetUpload}
          </Button>
          {path && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => save(workId, () => removeSheet(item.id, path), copy.toast.deleted)}>
              {copy.bible.sheetRemove}
            </Button>
          )}
          {!path && <span className={s.muted}>{copy.bible.sheetHint}</span>}
          <input
            ref={input}
            type="file"
            accept={Object.keys(SHEET_TYPES).join(',')}
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
