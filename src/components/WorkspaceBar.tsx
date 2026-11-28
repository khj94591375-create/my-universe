import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { workNav } from '../config/nav';
import { copy } from '../config/copy';
import { getSampleWork, listMyWorks } from '../data/works';
import type { Work, WorkWithStats } from '../data/types';
import { signOut } from '../features/auth/auth';
import { useSession } from '../features/auth/SessionProvider';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';
import s from './WorkspaceBar.module.css';

/**
 * 로그인 뒤 모든 화면의 상단바: 로고(내 작품) · 작품 선택기 · 다섯 메뉴 · 계정 메뉴.
 * 휴대폰(860px 이하)에서는 다섯 메뉴가 화면 아래 탐색 막대로 내려간다(BottomNav).
 * work가 없으면(내 작품·설정 화면) 메뉴 없이 로고와 계정만.
 */
export function WorkspaceBar({ work, pending = 0 }: { work?: Work | null; pending?: number }) {
  return (
    <header className={s.bar}>
      <Link to="/works" className={s.brand} title={copy.shell.toWorks}>
        <BrandMark size={26} />
        <b>{copy.brand.name}</b>
      </Link>
      {work && <WorkSwitcher work={work} />}
      {work && (
        <nav className={s.nav} aria-label={copy.shell.mainNav}>
          <NavLinks workId={work.id} pending={pending} />
        </nav>
      )}
      <div className={s.right}>
        <ThemeToggle compact className={s.theme} />
        <AccountButton />
      </div>
    </header>
  );
}

/** 휴대폰 하단 탐색(작업실 · 지도 · 원고 · 설정집 · 삽화) */
export function BottomNav({ workId, pending = 0 }: { workId: string; pending?: number }) {
  return (
    <nav className={s.bottom} aria-label={copy.shell.bottomNav}>
      <NavLinks workId={workId} pending={pending} short />
    </nav>
  );
}

function NavLinks({ workId, pending, short }: { workId: string; pending: number; short?: boolean }) {
  const { pathname } = useLocation();
  const here = pathname.split('/')[3] ?? '';
  return (
    <>
      {workNav.map((n) => {
        const on = n.match.includes(here);
        return (
          <Link key={n.path} to={`/w/${workId}/${n.path}`} className={on ? `${s.link} ${s.on}` : s.link} aria-current={on ? 'page' : undefined}>
            <Icon name={n.icon} size={short ? 20 : 17} className={s.icon} />
            <span>{short ? n.short : n.label}</span>
            {n.path === 'episodes' && pending > 0 && (
              <span className={s.badge} aria-label={copy.shell.pending(pending)}>
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

/** 바깥을 누르거나 Esc를 누르면 닫히는 작은 팝오버. 닫히면 여는 버튼으로 초점을 돌려준다 */
function usePopover() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, box, btn };
}

function Popover({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className={s.pop}>
      {children}
    </div>
  );
}

/** 현재 작품 이름 + 다른 작품으로 바꾸기(목록은 열 때 한 번 불러온다) */
function WorkSwitcher({ work }: { work: Work }) {
  const { session } = useSession();
  const p = usePopover();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [list, setList] = useState<{ mine: WorkWithStats[]; sample: WorkWithStats | null } | null>(null);
  useEffect(() => {
    if (!p.open || list) return;
    let alive = true;
    Promise.all([session ? listMyWorks(session.user.id) : Promise.resolve([]), getSampleWork()]).then(
      ([mine, sample]) => alive && setList({ mine, sample }),
      () => alive && setList({ mine: [], sample: null }),
    );
    return () => {
      alive = false;
    };
  }, [p.open, list, session]);
  // 작품을 바꿔도 지금 보던 메뉴(지도·설정집 등)는 그대로
  const section = pathname.split('/')[3] ?? 'home';
  const go = (id: string) => {
    p.setOpen(false);
    nav(`/w/${id}/${section}`);
  };
  const row = (w: WorkWithStats) => (
    <li key={w.id}>
      <button type="button" className={w.id === work.id ? `${s.item} ${s.itemOn}` : s.item} aria-current={w.id === work.id || undefined} onClick={() => go(w.id)}>
        {w.title}
      </button>
    </li>
  );
  return (
    <div className={s.switch} ref={p.box}>
      <button ref={p.btn} type="button" className={s.switchBtn} aria-haspopup="true" aria-expanded={p.open} aria-controls="work-switch" aria-label={copy.shell.switchWork(work.title)} onClick={() => p.setOpen(!p.open)}>
        <Icon name="layers" size={15} className={s.icon} />
        <span className={s.switchTitle}>{work.title}</span>
        <span className={s.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {p.open && (
        <Popover id="work-switch">
          {!list ? (
            <p className={s.popNote}>{copy.shell.worksLoading}</p>
          ) : (
            <>
              {session && (
                <>
                  <p className={s.popHead}>{copy.shell.myWorks}</p>
                  <ul className={s.popList}>{list.mine.map(row)}</ul>
                </>
              )}
              {list.sample && (
                <>
                  <p className={s.popHead}>{copy.shell.sampleWorks}</p>
                  <ul className={s.popList}>{row(list.sample)}</ul>
                </>
              )}
              {session && (
                <Link to="/works" className={s.popLink} onClick={() => p.setOpen(false)}>
                  {copy.shell.allWorks}
                </Link>
              )}
            </>
          )}
        </Popover>
      )}
    </div>
  );
}

/** 이니셜 동그라미 → 이메일 · 설정 · 도움말·문의 · 로그아웃. 로그인 전이면 "구글로 시작하기" */
function AccountButton() {
  const { session } = useSession();
  const p = usePopover();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!session) {
    return (
      <Link to="/" className={s.login}>
        {copy.start.login}
      </Link>
    );
  }
  const email = session.user.email ?? '';
  const initial = (email.trim()[0] ?? '?').toUpperCase();
  return (
    <div className={s.account} ref={p.box}>
      <button ref={p.btn} type="button" className={s.avatar} aria-haspopup="true" aria-expanded={p.open} aria-controls="account-menu" aria-label={copy.shell.accountMenu(email)} onClick={() => p.setOpen(!p.open)}>
        {initial}
      </button>
      {p.open && (
        <Popover id="account-menu">
          <p className={s.popEmail} title={email}>
            <span className={s.srOnly}>{copy.shell.signedIn}: </span>
            {email}
          </p>
          <ul className={s.popList}>
            <li>
              <Link to="/settings" className={s.item} onClick={() => p.setOpen(false)}>
                <Icon name="settings" size={15} className={s.icon} />
                {copy.settings.title}
              </Link>
            </li>
            <li>
              <Link to="/settings#help" className={s.item} onClick={() => p.setOpen(false)}>
                <Icon name="sparkles" size={15} className={s.icon} />
                {copy.shell.help}
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={s.item}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signOut();
                  } finally {
                    nav('/', { replace: true });
                  }
                }}
              >
                <Icon name="logout" size={15} className={s.icon} />
                {copy.settings.logout}
              </button>
            </li>
          </ul>
        </Popover>
      )}
    </div>
  );
}
