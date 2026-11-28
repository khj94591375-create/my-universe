import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './workroom.module.css';

const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

/** 최근 원고 3개: 회차 · 제목 · 올린 날짜(누르면 회차 기록에서 그 회차) */
export function RecentUploadsSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const recent = data ? [...data.episodes].sort((x, y) => y.created_at.localeCompare(x.created_at) || y.no - x.no).slice(0, 3) : [];
  return (
    <section className={s.recent} aria-labelledby="recent-title">
      <div className={s.mapHead}>
        <h2 id="recent-title" className={s.cardHead}>
          {copy.home.recentTitle}
        </h2>
        <Link to={`/w/${workId}/episodes`} className={s.headLink}>
          {copy.home.recentAll}
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className={s.muted}>{copy.home.recentEmpty}</p>
      ) : (
        <ul className={s.recentList}>
          {recent.map((e) => (
            <li key={e.id}>
              <Link to={`/w/${workId}/episodes?open=${e.no}`} className={s.recentRow}>
                <Icon name="layers" size={16} className={s.checkIcon} />
                <span className={s.recentNo}>{e.no}화</span>
                <span className={s.recentTitle}>{e.title ?? `${e.no}화`}</span>
                <span className={s.muted}>{dateFmt.format(new Date(e.created_at))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
