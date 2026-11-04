import { db } from './client';

/*
 * 작품별 사용자 사전("앞으로도 이 표현 유지", 0005 SQL의 style_terms).
 * 맞춤법 검사에서만 쓴다. 원고·설정집·우주 지도와는 따로 저장된다.
 */
export type StyleTerm = { id: string; work_id: string; term: string; note: string | null; created_at: string };

const missingTable = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === 'PGRST205' || e.code === '42P01' || (e.message ?? '').includes('Could not find the table')));

/** 사전 목록. 0005 SQL을 아직 실행하지 않았으면 ready: false(검사는 그대로 동작). */
export async function listStyleTerms(workId: string): Promise<{ ready: boolean; terms: StyleTerm[] }> {
  const { data, error } = await db().from('style_terms').select('*').eq('work_id', workId).order('created_at');
  if (missingTable(error)) return { ready: false, terms: [] };
  if (error) throw error;
  return { ready: true, terms: (data ?? []) as StyleTerm[] };
}

export async function addStyleTerm(workId: string, term: string, note: string | null = null): Promise<void> {
  const { error } = await db().from('style_terms').upsert({ work_id: workId, term: term.trim(), note }, { onConflict: 'work_id,term', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeStyleTerm(id: string): Promise<void> {
  const { error } = await db().from('style_terms').delete().eq('id', id);
  if (error) throw error;
}
