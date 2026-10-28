import { Link, useNavigate } from 'react-router-dom';
import { WriteButton } from '../../../components/WriteButton';
import { Card } from '../../../components/Card';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

/** 최근 원고 3개 + 새 원고 올리기. */
export function RecentUploadsSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  const recent = data ? [...data.episodes].sort((x, y) => y.created_at.localeCompare(x.created_at) || y.no - x.no).slice(0, 3) : [];
  return (
    <Card title={copy.home.recentTitle}>
      {recent.length === 0 ? (
        <p className={s.placeholder}>{copy.home.recentEmpty}</p>
      ) : (
        <ul className={s.list}>
          {recent.map((e) => (
            <li key={e.id} className={s.row}>
              <Link to={`/w/${workId}/episodes?open=${e.no}`} className={s.rowMain}>
                {copy.home.recentItem(e.no, e.title ?? `${e.no}화`)}
              </Link>
              <span className={s.note}>{dateFmt.format(new Date(e.created_at))}</span>
            </li>
          ))}
        </ul>
      )}
      <WriteButton workId={workId} block onClick={() => nav(`/w/${workId}/upload`)} style={{ marginTop: 'var(--sp-2)' }}>
        {copy.home.newEpisode}
      </WriteButton>
    </Card>
  );
}
