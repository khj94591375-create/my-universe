import { copy } from '../config/copy';

/**
 * 오류를 화면에 보여 줄 문장으로 바꾼다.
 * Supabase 오류(PostgrestError, StorageError)는 Error가 아닌 일반 객체라서 String()으로 바꾸면 [object Object]가 된다.
 */
export function toMessage(e: unknown): string {
  const err = (e ?? {}) as { code?: unknown; message?: unknown };
  const message = typeof err.message === 'string' ? err.message : '';
  // 표가 없음 = SQL(0001_init.sql)을 아직 실행하지 않음
  if (err.code === 'PGRST205' || err.code === '42P01' || message.includes('Could not find the table')) {
    return copy.common.dbNotReady;
  }
  // 칸·제약이 없음 = 0002·0003 SQL을 아직 실행하지 않음
  if (err.code === 'PGRST204' || err.code === '42P10' || /column .*direction/.test(message) || message.includes('no unique or exclusion constraint')) {
    return copy.common.dbUpdate;
  }
  // 같은 내용이 이미 저장됨(두 번 눌렀거나 다른 탭에서 먼저 저장) — 영어 원문 대신 쉬운 말로
  if (err.code === '23505' || message.includes('duplicate key value')) return copy.common.duplicate;
  return message || copy.common.unknownError;
}
