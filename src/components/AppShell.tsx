import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { workNav } from '../config/nav';
import { copy } from '../config/copy';
import { BrandMark } from './BrandMark';
import s from './AppShell.module.css';

/** 작품 안 화면의 공통 틀: 왼쪽 남색 메뉴 + 오른쪽 종이색 작업 영역. 860px 이하에서 메뉴는 위쪽 띠로 접힌다. */
export function AppShell() {
  const { workId = '' } = useParams();
  const isSample = workId === 'sample';
  return (
    <div className={s.app}>
      <aside className={s.side}>
        <Link to="/works" className={s.brand} aria-label="작품 목록으로">
          <BrandMark />
          <b>{copy.brand.name}</b>
        </Link>
        <div className={s.work}>
          지금 보는 작품
          <strong>{isSample ? '별의 도서관' : '내 작품'}</strong>
          {isSample && <span>{copy.works.sampleLabel}</span>}
        </div>
        <nav className={s.nav} aria-label="작품 메뉴">
          {workNav.map((n) => (
            <NavLink key={n.path} to={`/w/${workId}/${n.path}`} className={({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)}>
              <i aria-hidden="true">{n.icon}</i>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={s.foot}>
          <span>{copy.brand.principle}</span>
          <Link to="/settings">{copy.settings.title}</Link>
        </div>
      </aside>
      <main className={s.main}>
        {isSample && <div className={s.sampleBar}>{copy.works.sampleLabel}</div>}
        <Outlet />
      </main>
    </div>
  );
}
