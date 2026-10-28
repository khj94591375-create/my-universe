import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { copy } from '../../../config/copy';
import { forgottenItems } from '../../../features/foreshadow/useSlump';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

/** 잊힌 상위 2개를 엮은 한 줄 제안. */
export function TodaySuggestionSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const [a, b] = data ? forgottenItems(data.items) : [];
  return (
    <Card title={copy.home.suggestionTitle}>
      {a && b ? (
        <>
          <p className={s.suggestion}>{copy.home.suggestion(a.name, a.last_ep ?? 0, b.name, b.last_ep ?? 0)}</p>
          <Link to={`/w/${workId}/map?sel=${a.id},${b.id}`} className={s.rowLink}>
            {copy.home.toMap} →
          </Link>
        </>
      ) : (
        <p className={s.placeholder}>{copy.home.suggestionEmpty}</p>
      )}
    </Card>
  );
}
