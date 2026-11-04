import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { copy } from '../config/copy';
import { tourSteps } from '../config/guide';
import { SAMPLE_WORK_ID } from '../config/sample';
import { useSession } from '../features/auth/SessionProvider';
import { closeTour, openTour, useGuideState, useTourOpen } from '../features/guide/guideState';
import { Button } from './Button';
import s from './GuideTour.module.css';

/**
 * 처음 사용 가이드(모달). 앱에 하나만 둔다(App.tsx).
 * 로그인 사용자는 작품 목록에 처음 왔을 때, 로그인하지 않은 사람은 예시 작품에 처음 들어왔을 때 저절로 열린다.
 * Esc = 건너뛰기, Tab은 창 안에서 돈다.
 */
export function GuideTour() {
  const { session, loading } = useSession();
  const guide = useGuideState();
  const open = useTourOpen();
  const loc = useLocation();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // 저절로 열기
  const auto = !loading && !guide.tourSeen && (session ? loc.pathname === '/works' : loc.pathname.startsWith(`/w/${SAMPLE_WORK_ID}`));
  useEffect(() => {
    if (auto) openTour();
  }, [auto]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    returnTo.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // 뒤 화면 스크롤 막기
    return () => {
      document.body.style.overflow = prev;
      returnTo.current?.focus?.();
    };
  }, [open]);

  // 장이 바뀔 때마다 창 안 첫 행동 버튼에 초점
  useEffect(() => {
    if (open) box.current?.querySelector<HTMLElement>('[data-primary]')?.focus();
  }, [open, step]);

  if (!open) return null;
  const last = step === tourSteps.length - 1;
  const cur = tourSteps[step];

  const finish = (how: 'done' | 'skipped', then?: () => void) => {
    guide.markTour(how);
    closeTour();
    then?.();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish('skipped');
      return;
    }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (items.length === 0) return;
    const first = items[0];
    const lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={s.backdrop}>
      <div ref={box} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-body" onKeyDown={onKeyDown}>
        <div className={s.head}>
          <span className={s.progress} aria-label={copy.guide.dialog}>
            {copy.guide.step(step + 1, tourSteps.length)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => finish('skipped')}>
            {copy.guide.skip}
          </Button>
        </div>
        <div className={s.icon} aria-hidden="true">
          {cur.icon}
        </div>
        <h2 id="guide-title" className={s.title}>
          {cur.title}
        </h2>
        <div id="guide-body" className={s.body}>
          {cur.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <ol className={s.dots} aria-hidden="true">
          {tourSteps.map((t, i) => (
            <li key={t.title} className={i === step ? s.dotOn : s.dot} />
          ))}
        </ol>
        <div className={s.actions}>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              {copy.guide.prev}
            </Button>
          )}
          {!last ? (
            <Button data-primary onClick={() => setStep(step + 1)}>
              {copy.guide.next}
            </Button>
          ) : session ? (
            <>
              <Button variant="ghost" onClick={() => finish('done', () => nav(`/w/${SAMPLE_WORK_ID}/home`))}>
                {copy.guide.sample}
              </Button>
              <Button data-primary variant="accent" onClick={() => finish('done', () => nav('/works?new=1'))}>
                {copy.guide.newWork}
              </Button>
            </>
          ) : (
            <Button data-primary variant="accent" onClick={() => finish('done')}>
              {copy.guide.start}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
