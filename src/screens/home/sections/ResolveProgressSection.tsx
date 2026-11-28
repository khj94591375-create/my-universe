import { Card } from '../../../components/Card';
import { StatusTag } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import type { ItemStatus } from '../../../data/types';
import { useWorkData } from '../../../features/works/workData';
import { resolvedCount } from '../../../features/foreshadow/resolved';
import s from './sections.module.css';

const ORDER: ItemStatus[] = ['open', 'resolved', 'reuse_planned', 'reused'];

/** 복선 회수 현황: 회수 수/전체, 막대, 상태별 개수. */
export function ResolveProgressSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const fs = data ? data.items.filter((i) => i.kind === 'foreshadow') : [];
  const count = (st: ItemStatus) => fs.filter((i) => i.status === st).length;
  // 회수 = 회수 완료 + 재사용됨(재사용 예정은 아직 아님). 홈 지도 칸의 "회수한 복선"과 같은 기준
  const { done, total } = resolvedCount(fs);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [big, rest] = copy.home.progressCount(done, total);
  return (
    <Card title={copy.home.progressTitle} tone="plain">
      <p className={s.big}>
        {big} <span>{rest}</span>
      </p>
      <div className={s.bar} role="progressbar" aria-label={copy.home.progressTitle} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
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
