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

const MANUAL_PROMPT = '작가가 직접 올림';

async function removeImageFile(path: string) {
  await db().storage.from('images').remove([path]);
  await db().from('images').delete().eq('storage_path', path);
}

/** 이미지 시트를 바꾸거나 뺄 때: 직접 올린 그림만 지운다(스튜디오에서 만든 그림은 갤러리에 남긴다). */
async function removeIfManual(path: string) {
  const { data } = await db().from('images').select('prompt').eq('storage_path', path).maybeSingle();
  if (!data || data.prompt === MANUAL_PROMPT) await removeImageFile(path);
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
  const row = await c.from('images').insert({ id, work_id: workId, purpose: 'sheet', item_ids: [itemId], prompt: MANUAL_PROMPT, storage_path: path });
  if (row.error) {
    await c.storage.from('images').remove([path]);
    throw row.error;
  }
  const upd = await c.from('items').update({ reference_image_path: path }).eq('id', itemId);
  if (upd.error) throw upd.error;
  if (previousPath) await removeIfManual(previousPath);
}

export async function removeSheet(itemId: string, path: string) {
  const { error } = await db().from('items').update({ reference_image_path: null }).eq('id', itemId);
  if (error) throw error;
  await removeIfManual(path);
}

/* ── 삽화 스튜디오 갤러리(BUILD_SPEC 6.10) ── */

export type StoredImage = { id: string; work_id: string; purpose: 'sketch' | 'illustration' | 'cover' | 'sheet' | null; item_ids: string[] | null; prompt: string; storage_path: string; created_at: string };

/** 작품의 그림(직접 올린 이미지 시트 제외), 최근 것부터. */
export async function listWorkImages(workId: string): Promise<StoredImage[]> {
  const { data, error } = await db().from('images').select('*').eq('work_id', workId).neq('prompt', MANUAL_PROMPT).order('created_at', { ascending: false });
  if (error) throw error;
  return data as StoredImage[];
}

export async function signedImageUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await db().storage.from('images').createSignedUrls(paths, 3600);
  if (error) throw error;
  return new Map((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as [string, string]] : [])));
}

/** 스튜디오 그림을 항목의 이미지 시트로 등록. 예전 시트가 직접 올린 그림이면 지운다. */
export async function setSheetFromImage(itemId: string, path: string, previousPath: string | null) {
  const { error } = await db().from('items').update({ reference_image_path: path }).eq('id', itemId);
  if (error) throw error;
  if (previousPath && previousPath !== path) await removeIfManual(previousPath);
}

/** 갤러리 그림 지우기. 이 그림을 이미지 시트로 쓰는 항목이 있으면 시트도 뺀다. */
export async function deleteStudioImage(workId: string, path: string) {
  const { error } = await db().from('items').update({ reference_image_path: null }).eq('work_id', workId).eq('reference_image_path', path);
  if (error) throw error;
  await removeImageFile(path);
}
