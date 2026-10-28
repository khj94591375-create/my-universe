import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Button } from '../../../components/Button';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { SHEET_MAX_BYTES, SHEET_TYPES, removeSheet, signedImageUrl, uploadSheet } from '../../../data/images';
import type { ItemView } from '../../../data/types';
import { save } from '../../../features/works/save';
import s from './bible.module.css';

/** 클립보드·끌어 놓기에서 받은 그림 하나. 이름이 없으면 붙여 넣은 그림으로 이름을 지어 준다. */
function asFile(blob: Blob | null | undefined): File | null {
  if (!blob || !blob.type.startsWith('image/')) return null;
  if (blob instanceof File && blob.name) return blob;
  const ext = SHEET_TYPES[blob.type] ?? 'png';
  return new File([blob], `pasted.${ext}`, { type: blob.type });
}

/**
 * 항목의 이미지 시트: 썸네일 + 올리기·붙여 넣기·바꾸기·빼기(내 작품일 때만).
 * 그림 칸을 누르고 Ctrl+V로 붙여 넣거나, 그림 파일을 끌어다 놓아도 된다.
 */
export function SheetImage({ workId, item, canWrite }: { workId: string; item: ItemView; canWrite: boolean }) {
  const path = item.reference_image_path;
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path) signedImageUrl(path).then((u) => alive && setUrl(u), () => undefined);
    return () => {
      alive = false;
    };
  }, [path]);

  if (!path && !canWrite) return null;

  const pick = async (file: File | null | undefined) => {
    if (!file || busy) return;
    if (!SHEET_TYPES[file.type]) return showToast(copy.bible.sheetType, 'error');
    if (file.size > SHEET_MAX_BYTES) return showToast(copy.bible.sheetSize, 'error');
    setBusy(true);
    await save(workId, () => uploadSheet(workId, item.id, file, path), copy.bible.sheetSaved);
    setBusy(false);
  };

  // Ctrl+V: 그림 칸에 초점이 있을 때
  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.items].map((it) => (it.kind === 'file' ? asFile(it.getAsFile()) : null)).find(Boolean);
    if (!file) return showToast(copy.bible.sheetPasteEmpty, 'error');
    e.preventDefault();
    pick(file);
  };

  // "붙여 넣기" 버튼: 브라우저가 클립보드 읽기를 허락하면 바로, 아니면 Ctrl+V 안내
  const pasteFromButton = async () => {
    if (!navigator.clipboard?.read) {
      zone.current?.focus();
      return showToast(copy.bible.sheetPasteKeys);
    }
    try {
      for (const entry of await navigator.clipboard.read()) {
        const type = entry.types.find((t) => t.startsWith('image/'));
        if (type) return pick(asFile(await entry.getType(type)));
      }
      showToast(copy.bible.sheetPasteEmpty, 'error');
    } catch {
      zone.current?.focus();
      showToast(copy.bible.sheetPasteKeys);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(asFile(e.dataTransfer.files[0]));
  };

  if (!canWrite) {
    return <div className={s.sheet}>{url ? <img src={url} alt={copy.bible.sheetAlt(item.name)} className={s.thumb} /> : <span className={s.thumbEmpty} aria-hidden="true" />}</div>;
  }

  return (
    <div className={s.sheet}>
      <div
        ref={zone}
        tabIndex={0}
        role="button"
        aria-label={copy.bible.sheetPasteZone(item.name)}
        className={over ? `${s.pasteZone} ${s.pasteOver}` : s.pasteZone}
        onPaste={onPaste}
        onClick={() => zone.current?.focus()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        title={copy.bible.sheetPasteHint}
      >
        {url ? <img src={url} alt={copy.bible.sheetAlt(item.name)} className={s.thumb} /> : <span className={s.pastePlus} aria-hidden="true">{busy ? '…' : '+'}</span>}
      </div>
      <div className={s.sheetActions}>
        <Button variant="ghost" size="sm" loading={busy} onClick={() => input.current?.click()}>
          {path ? copy.bible.sheetReplace : copy.bible.sheetUpload}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={pasteFromButton}>
          {copy.bible.sheetPaste}
        </Button>
        {path && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => save(workId, () => removeSheet(item.id, path), copy.toast.deleted)}>
            {copy.bible.sheetRemove}
          </Button>
        )}
        <span className={s.muted}>{path ? copy.bible.sheetPasteHint : copy.bible.sheetHint}</span>
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
    </div>
  );
}
