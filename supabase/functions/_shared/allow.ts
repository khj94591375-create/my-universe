/*
 * 이메일 허용 목록 검사(외부 라이브러리 없음 — 브라우저 테스트와 Deno가 함께 쓴다).
 * 비밀값에 사람이 손으로 적는 값이라 너그럽게 읽는다: 따옴표·꺾쇠·mailto:·"이름=" 앞부분은 떼고,
 * 쉼표·세미콜론·줄바꿈·공백 모두 구분자로 본다.
 */

/** 비교용 이메일: 소문자, 지메일은 점·+태그를 무시하고 googlemail.com을 gmail.com으로(구글이 같은 계정으로 보는 규칙) */
export function normalizeEmail(raw: string): string {
  const e = raw.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+')[0].replace(/\./g, '');
  return `${local}@${domain}`;
}

/** 비밀값 글자에서 이메일 목록을 뽑는다 */
export function parseEmailList(list: string): string[] {
  return list
    .replace(/^[^=@]*=/, '') // "IMAGE_ALLOWED_EMAILS=..."처럼 이름까지 붙여 넣은 경우
    .split(/[,;\s]+/)
    .map((e) => e.replace(/^["'<(\[]+|["'>)\].]+$/g, '').replace(/^mailto:/i, ''))
    .filter((e) => e.includes('@'))
    .map(normalizeEmail);
}

/** list가 비면 모두 허용, 있으면 그 이메일만. */
export function emailAllowed(list: string, email: string | null): boolean {
  const allowed = parseEmailList(list);
  if (allowed.length === 0) return true;
  return Boolean(email && allowed.includes(normalizeEmail(email)));
}
