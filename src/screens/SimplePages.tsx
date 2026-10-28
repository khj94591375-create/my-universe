import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { copy } from '../config/copy';
import { isSupabaseConfigured } from '../lib/supabase';

const wrap: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 16 };

/** 내 설정(BUILD_SPEC 6.11). M0: 연결 상태만 표시. */
export function SettingsScreen() {
  return (
    <div style={wrap}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--fs-xl)' }}>{copy.settings.title}</h1>
      <Card title="연결 상태">
        <p>Supabase 설정: {isSupabaseConfigured ? '연결 준비됨' : '환경 변수가 없어요(.env 확인)'}</p>
        <p style={{ color: 'var(--c-sub)', fontSize: 'var(--fs-sm)' }}>계정, 사용량, 데이터 내보내기는 M1·M4에서 추가돼요.</p>
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
