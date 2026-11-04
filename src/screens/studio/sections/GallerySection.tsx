import { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Loading } from '../../../components/Loading';
import { Tag } from '../../../components/Tag';
import { SelectField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { art } from '../../../config/art';
import { deleteStudioImage, setSheetFromImage, signedImageUrls, type StoredImage } from '../../../data/images';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import type { StudioPrefill } from './StudioFormSection';
import s from './studio.module.css';

/** 만든 그림: 크게 보기, 보낸 요청 문장, 이 이미지로 다시 그리기, 이미지 시트로 등록, 지우기. */
export function GallerySection({
  workId,
  images,
  error,
  freshId,
  onChanged,
  onRedraw,
}: {
  workId: string;
  images: StoredImage[] | null;
  error: string | null;
  freshId: string | null;
  onChanged: () => void;
  onRedraw: (p: StudioPrefill) => void;
}) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const key = (images ?? []).map((i) => i.storage_path).join(',');
  useEffect(() => {
    if (!images?.length) return;
    signedImageUrls(images.map((i) => i.storage_path)).then(setUrls, () => undefined);
  }, [key]);

  if (error) return <ErrorState body={error} onRetry={onChanged} />;
  if (!images || !data) return <Loading />;

  return (
    <Card title={copy.studio.galleryTitle}>
      {images.length === 0 ? (
        <EmptyState art={art.emptyCollection} title={copy.studio.galleryEmpty} />
      ) : (
        <ul className={s.gallery}>
          {images.map((img, n) => {
            const url = urls.get(img.storage_path);
            const purpose = img.purpose ? copy.studio.purposes[img.purpose] : '';
            const used = (img.item_ids ?? []).map((id) => data.itemById.get(id)?.name).filter(Boolean);
            return (
              <li key={img.id} className={img.id === freshId ? `${s.card} ${s.fresh}` : s.card}>
                {url ? <img src={url} alt={copy.studio.alt(purpose, images.length - n)} className={s.image} /> : <span className={s.imageEmpty} aria-hidden="true" />}
                <div className={s.meta}>
                  <Tag>{purpose}</Tag>
                  {img.id === freshId && <Tag tone="gold">{copy.studio.newBadge}</Tag>}
                  {used.length > 0 && (
                    <span className={s.muted}>
                      {copy.studio.usedItems}: {used.join(', ')}
                    </span>
                  )}
                </div>
                <details className={s.preview}>
                  <summary>{copy.studio.showPrompt}</summary>
                  <pre>{img.prompt}</pre>
                </details>
                <div className={s.actions}>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className={s.link}>
                      {copy.studio.open}
                    </a>
                  )}
                  {canWrite && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => onRedraw({ purpose: img.purpose ?? 'illustration', itemIds: img.item_ids ?? [], referencePath: img.storage_path })}>
                        {copy.studio.redraw}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSheetFor(img.id); setSheetItem(img.item_ids?.[0] ?? ''); }}>
                        {copy.studio.asSheet}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRemoving(img.id)}>
                        {copy.studio.remove}
                      </Button>
                    </>
                  )}
                </div>
                {sheetFor === img.id && (
                  <div className={s.sheetPick}>
                    <SelectField
                      label={copy.studio.asSheetPick}
                      value={sheetItem}
                      onChange={(e) => setSheetItem(e.target.value)}
                      options={[['', '—'], ...data.items.map((i) => [i.id, i.name] as [string, string])]}
                    />
                    <Button size="sm" disabled={!sheetItem} onClick={async () => {
                      const it = data.itemById.get(sheetItem);
                      if (!it) return;
                      const ok = await save(workId, () => setSheetFromImage(it.id, img.storage_path, it.reference_image_path), copy.studio.sheetDone(it.name));
                      if (ok) setSheetFor(null);
                    }}>
                      {copy.studio.asSheetYes}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSheetFor(null)}>
                      {copy.studio.cancel}
                    </Button>
                  </div>
                )}
                {removing === img.id && (
                  <ConfirmBar
                    message={copy.studio.removeConfirm}
                    confirmLabel={copy.studio.remove}
                    cancelLabel={copy.studio.cancel}
                    onCancel={() => setRemoving(null)}
                    onConfirm={async () => {
                      const ok = await save(workId, () => deleteStudioImage(workId, img.storage_path), copy.toast.deleted);
                      setRemoving(null);
                      if (ok) onChanged();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
