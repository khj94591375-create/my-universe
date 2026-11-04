import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

/** 열린 설정 충돌 수(BUILD_SPEC 6.3). 충돌이 없으면 보이지 않는다. */
export function ConflictsSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const open = data ? data.issues.filter((i) => i.status === 'open').length : 0;
  if (open === 0) return null;
  return (
    <Card title={copy.home.conflictsTitle}>
      <p className={s.note}>{copy.home.conflictsOpen(open)}</p>
      <Link to={`/w/${workId}/bible#conflicts`} className={s.rowLink}>
        {copy.home.conflictsLink} →
      </Link>
    </Card>
  );
}
