import { Link, useLocation } from 'react-router-dom';
import { copy } from '../../config/copy';
import { manuscriptTabs } from '../../config/nav';
import { unreviewedCount } from '../../features/ai/review';
import { useWorkData } from '../../features/works/workData';
import s from './ManuscriptTabs.module.css';

/** 원고 메뉴의 하위 탭: 회차 기록 / 원고 불러오기 / 정리 결과 검토(확인할 AI 추정 수) */
export function ManuscriptTabs({ workId }: { workId: string }) {
  const { pathname } = useLocation();
  const here = pathname.split('/')[3] ?? '';
  const { data } = useWorkData(workId);
  const pending = unreviewedCount(data);
  return (
    <nav className={s.tabs} aria-label={copy.shell.manuscriptTabs}>
      {manuscriptTabs.map((t) => (
        <Link key={t.path} to={`/w/${workId}/${t.path}`} className={t.path === here ? `${s.tab} ${s.on}` : s.tab} aria-current={t.path === here ? 'page' : undefined}>
          {t.label}
          {t.path === 'review' && pending > 0 && (
            <span className={s.badge} aria-label={copy.shell.pending(pending)}>
              {pending}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
