import { Card } from '../../../components/Card';
import { copy } from '../../../config/copy';
import s from './sections.module.css';

/** 오래 잊힌 항목 최대 4개. 데이터 연결은 M2. */
export function ForgottenListSection({ workId: _workId }: { workId: string }) {
  return (
    <Card title="오래 잊힌 복선과 설정">
      <p className={s.placeholder}>{copy.home.emptyTitle}</p>
    </Card>
  );
}
