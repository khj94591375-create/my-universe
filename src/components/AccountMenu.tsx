import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { copy } from '../config/copy';
import { signOut } from '../features/auth/auth';
import { useSession } from '../features/auth/SessionProvider';
import s from './AccountMenu.module.css';

/**
 * 로그인한 이메일 + 내 설정 + 로그아웃. 화면 폭과 상관없이 항상 보인다(전자정부 점검표: 주요 기능 접근성).
 * 로그인하지 않았으면 "구글로 시작하기".
 */
export function AccountMenu({ tone = 'navy' }: { tone?: 'navy' }) {
  const { session } = useSession();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!session) {
    return (
      <div className={`${s.menu} ${s[tone]}`}>
        <Link to="/">{copy.start.login}</Link>
      </div>
    );
  }
  const email = session.user.email ?? '';
  return (
    <div className={`${s.menu} ${s[tone]}`} role="group" aria-label={copy.shell.account}>
      <span className={s.email} title={email}>
        <span className={s.srOnly}>{copy.shell.signedIn}: </span>
        {email}
      </span>
      <span className={s.links}>
        <Link to="/settings">{copy.settings.title}</Link>
        <button
          type="button"
          className={s.logout}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
            } finally {
              nav('/', { replace: true });
            }
          }}
        >
          {copy.settings.logout}
        </button>
      </span>
    </div>
  );
}
