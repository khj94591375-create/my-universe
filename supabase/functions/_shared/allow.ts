/*
 * 이메일 허용 목록 검사(외부 라이브러리 없음 — 브라우저 테스트와 Deno가 함께 쓴다).
 */

/** list(쉼표로 구분)가 비면 모두 허용, 있으면 그 이메일만(대소문자·공백 무시). */
export function emailAllowed(list: string, email: string | null): boolean {
  const allowed = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return true;
  return Boolean(email && allowed.includes(email.trim().toLowerCase()));
}
