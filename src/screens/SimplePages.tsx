import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { copy } from '../config/copy';
import { isSupabaseConfigured } from '../lib/supabase';
import { signOut } from '../features/auth/auth';
import { useSession } from '../features/auth/SessionProvider';

const wrap: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 16 };
const sub: CSSProperties = { color: 'var(--c-sub)', fontSize: 'var(--fs-sm)' };

/** 내 설정(BUILD_SPEC 6.11). M1: 구글 이메일, 로그아웃. */
export function SettingsScreen() {
  const { session } = useSession();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      nav('/', { replace: true });
    }
  };

  return (
    <div style={wrap}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--fs-xl)' }}>{copy.settings.title}</h1>
      <Card title={copy.settings.account}>
        <p style={sub}>{copy.settings.email}</p>
        <p style={{ fontWeight: 700, marginBottom: 'var(--sp-3)', overflowWrap: 'anywhere' }}>{session?.user.email ?? '-'}</p>
        <Button variant="ghost" onClick={logout} loading={busy}>
          {copy.settings.logout}
        </Button>
      </Card>
      <Card title={copy.settings.connection}>
        <p>{isSupabaseConfigured ? copy.settings.connected : copy.settings.notConnected}</p>
        <p style={sub}>{copy.settings.later}</p>
      </Card>
      <Link to="/works">{copy.common.back}</Link>
    </div>
  );
}

export function NotFoundScreen() {
  return (
    <div style={wrap}>
      <EmptyState title={copy.common.notFound} action={<Link to="/">{copy.common.toStart}</Link>} />
    </div>
  );
}
