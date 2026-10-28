import { Card } from '../../../components/Card';
import { StatusTag } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import type { ItemStatus } from '../../../data/types';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

const ORDER: ItemStatus[] = ['open', 'resolved', 'reuse_planned', 'reused'];

/** 복선 회수 현황: 회수 수/전체, 막대, 상태별 개수. */
export function ResolveProgressSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const fs = data ? data.items.filter((i) => i.kind === 'foreshadow') : [];
  const count = (st: ItemStatus) => fs.filter((i) => i.status === st).length;
  const done = fs.length - count('open');
  const pct = fs.length ? Math.round((done / fs.length) * 100) : 0;
  const [big, rest] = copy.home.progressCount(done, fs.length);
  return (
    <Card title={copy.home.progressTitle}>
      <p className={s.big}>
        {big} <span>{rest}</span>
      </p>
      <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className={s.tags}>
        {ORDER.map((st) => (
          <span key={st} className={s.tagCount}>
            <StatusTag status={st} /> {count(st)}
          </span>
        ))}
      </div>
    </Card>
  );
}
