import { Card } from '../../../components/Card';
import { Tag } from '../../../components/Tag';
import s from './sections.module.css';

/** 복선 회수 현황. 데이터 연결은 M2. */
export function ResolveProgressSection({ workId: _workId }: { workId: string }) {
  return (
    <Card title="복선 회수 현황">
      <p className={s.big}>
        0 <span>/ 0개 회수</span>
      </p>
      <div className={s.bar} role="presentation">
        <span style={{ width: '0%' }} />
      </div>
      <div className={s.tags}>
        <Tag>미회수 0</Tag>
        <Tag tone="ok">회수 완료 0</Tag>
        <Tag tone="info">재사용 예정 0</Tag>
        <Tag tone="gold">재사용됨 0</Tag>
      </div>
    </Card>
  );
}
