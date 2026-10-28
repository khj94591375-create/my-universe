import { Card } from '../../../components/Card';
import s from './sections.module.css';

/** 잊힌 상위 2개를 엮은 한 줄 제안. 데이터 연결은 M2. */
export function TodaySuggestionSection({ workId: _workId }: { workId: string }) {
  return (
    <Card title="오늘의 한 줄 제안">
      <p className={s.placeholder}>잊힌 항목이 두 개 이상 생기면 엮어서 제안해 드려요.</p>
    </Card>
  );
}
