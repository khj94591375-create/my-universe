import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './workroom.module.css';

/** 2026.01.18 (토) */
const dateText = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${'일월화수목금토'[d.getDay()]})`;
};

/** 최근 원고 3개: 회차 · 제목 · 올린 날짜(누르면 회차 기록에서 그 회차) */
export function RecentUploadsSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const recent = data ? [...data.episodes].sort((x, y) => y.created_at.localeCompare(x.created_at) || y.no - x.no).slice(0, 3) : [];
  return (
    <section className={s.recent} aria-labelledby="recent-title">
      <div className={s.mapHead}>
        <h2 id="recent-title" className={s.sectionTitle}>
          {copy.home.recentTitle}
        </h2>
        <Link to={`/w/${workId}/episodes`} className={s.headLink}>
          {copy.home.recentAll} <span aria-hidden="true">→</span>
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className={s.muted}>{copy.home.recentEmpty}</p>
      ) : (
        <ul className={s.recentList}>
          {recent.map((e) => (
            <li key={e.id} className={s.recentItem}>
              <Link to={`/w/${workId}/episodes?open=${e.no}`} className={s.recentRow}>
                <Icon name="layers" size={18} className={s.recentIcon} />
                <span className={s.recentTitle}>
                  {e.no}화 {e.title ?? ''}
                </span>
                <span className={s.recentDate}>{dateText(e.created_at)}</span>
              </Link>
              <Link to={`/w/${workId}/episodes?open=${e.no}`} className={s.recentMore} aria-label={copy.home.recentMore(e.no)}>
                ⋯
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
