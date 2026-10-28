import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { copy } from '../config/copy';

const wrap: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 16 };

export function NotFoundScreen() {
  return (
    <div style={wrap}>
      <EmptyState title={copy.common.notFound} action={<Link to="/">{copy.common.toStart}</Link>} />
    </div>
  );
}
