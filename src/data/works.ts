import type { Work, WorkStats, WorkWithStats } from './types';
import { db } from './client';
import { SAMPLE_WORK_ID } from '../config/sample';

/*
 * 작품 쿼리 함수. 화면은 Supabase를 직접 부르지 않고 이 함수를 쓴다.
 * 누가 무엇을 볼 수 있는지는 DB의 RLS가 정한다(BUILD_SPEC 5.3).
 */

const EMPTY_STATS: WorkStats = { episode_count: 0, open_foreshadow_count: 0, last_upload_at: null };

async function attachStats(works: Work[]): Promise<WorkWithStats[]> {
  if (works.length === 0) return [];
  const { data, error } = await db()
    .from('work_stats')
    .select('work_id, episode_count, open_foreshadow_count, last_upload_at')
    .in('work_id', works.map((w) => w.id));
  if (error) throw error;
  const byId = new Map(data.map((s) => [s.work_id as string, s as WorkStats]));
  return works.map((w) => ({ ...w, ...EMPTY_STATS, ...byId.get(w.id) }));
}

/** 로그인한 사람의 작품(최근 만든 순). */
export async function listMyWorks(userId: string): Promise<WorkWithStats[]> {
  const { data, error } = await db()
    .from('works')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachStats(data as Work[]);
}

/** 예시 작품 "별의 도서관". 시드를 아직 안 넣었으면 null. */
export async function getSampleWork(): Promise<WorkWithStats | null> {
  const work = await getWork(SAMPLE_WORK_ID);
  if (!work) return null;
  const [withStats] = await attachStats([work]);
  return withStats;
}

/** 작품 하나. 없거나 볼 권한이 없으면 null. */
export async function getWork(id: string): Promise<Work | null> {
  const { data, error } = await db().from('works').select('*').eq('id', id).maybeSingle();
  if (error) {
    if (error.code === '22P02') return null; // id 형식이 uuid가 아님
    throw error;
  }
  return data as Work | null;
}

export async function createWork(input: { title: string; genre: string }): Promise<Work> {
  const { data, error } = await db()
    .from('works')
    .insert({ title: input.title.trim(), genre: input.genre.trim() || null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Work;
}

export async function renameWork(id: string, title: string): Promise<void> {
  const { error } = await db().from('works').update({ title: title.trim() }).eq('id', id);
  if (error) throw error;
}

/**
 * 작품 삭제. Storage의 이미지(images/{work_id}/...)를 먼저 지우고 작품 행을 지운다.
 * 회차·장면·항목·연결선·이미지 기록은 DB의 on delete cascade로 함께 지워진다(BUILD_SPEC 6.2).
 */
export async function deleteWork(id: string): Promise<void> {
  const bucket = db().storage.from('images');
  for (;;) {
    const { data: files, error } = await bucket.list(id, { limit: 100 });
    if (error) throw error;
    if (!files || files.length === 0) break;
    const { error: rmError } = await bucket.remove(files.map((f) => `${id}/${f.name}`));
    if (rmError) throw rmError;
    if (files.length < 100) break;
  }
  const { error } = await db().from('works').delete().eq('id', id);
  if (error) throw error;
}
