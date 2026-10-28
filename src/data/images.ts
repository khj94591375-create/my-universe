import { db } from './client';

/*
 * 이미지 시트(BUILD_SPEC 5.1 images, 6.8). 비공개 Storage 버킷 images/{work_id}/{image_id}.{확장자}.
 * 화면에는 1시간짜리 서명 URL로만 보여 준다.
 */

export const SHEET_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const SHEET_MAX_BYTES = 5 * 1024 * 1024;

export async function signedImageUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('images').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function removeImageFile(path: string) {
  await db().storage.from('images').remove([path]);
  await db().from('images').delete().eq('storage_path', path);
}

/** 작가가 직접 올린 그림을 항목의 이미지 시트로 등록한다. 이전 시트가 있으면 지운다. */
export async function uploadSheet(workId: string, itemId: string, file: File, previousPath: string | null) {
  const ext = SHEET_TYPES[file.type];
  if (!ext) throw new Error('type');
  if (file.size > SHEET_MAX_BYTES) throw new Error('size');
  const id = crypto.randomUUID();
  const path = `${workId}/${id}.${ext}`;
  const c = db();
  const up = await c.storage.from('images').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const row = await c.from('images').insert({ id, work_id: workId, purpose: 'sheet', item_ids: [itemId], prompt: '작가가 직접 올림', storage_path: path });
  if (row.error) {
    await c.storage.from('images').remove([path]);
    throw row.error;
  }
  const upd = await c.from('items').update({ reference_image_path: path }).eq('id', itemId);
  if (upd.error) throw upd.error;
  if (previousPath) await removeImageFile(previousPath);
}

export async function removeSheet(itemId: string, path: string) {
  const { error } = await db().from('items').update({ reference_image_path: null }).eq('id', itemId);
  if (error) throw error;
  await removeImageFile(path);
}
