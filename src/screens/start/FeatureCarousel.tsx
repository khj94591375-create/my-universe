import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArtImage } from '../../components/ArtImage';
import { Icon } from '../../components/Icon';
import { art, startSlides, type StartSlide } from '../../config/art';
import { copy } from '../../config/copy';
import { ConstellationArt } from './ConstellationArt';
import s from './FeatureCarousel.module.css';

/**
 * 시작 화면의 기능 소개: 큰 그림을 한 장씩 넘겨 본다(자동으로 넘어가지 않는다).
 * 지금 장면 옆에 다음 장면이 살짝 보이고, 아래에 제목·설명 한 줄, 점(몇 번째), 이전/다음 버튼. ←/→ 키로도 넘긴다.
 * 끝에서 다음 → 처음, 처음에서 이전 → 끝으로 이어서 돈다. 맨 뒤에 첫 장면을 하나 더 붙여(복제) 마지막 장면 옆에도 첫 장면이 보이게 하고,
 * 복제 장면까지 넘어간 뒤에는 움직임 없이 진짜 첫 장면으로 바꿔 끊김 없이 돈다.
 */
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function FeatureCarousel() {
  const total = startSlides.length;
  const [pos, setPos] = useState(0); // 0..total(total = 첫 장면 복제)
  const [anim, setAnim] = useState(true);
  const after = useRef<number | null>(null); // 움직임 없이 자리를 바꾼 뒤 이어서 움직여 갈 자리
  const cur = pos % total;

  // 자리를 움직임 없이 바꾼 다음 화면에 그려지면 움직임을 다시 켜고, 예약된 자리로 움직인다
  useEffect(() => {
    if (anim) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnim(true);
        if (after.current != null) {
          setPos(after.current);
          after.current = null;
        }
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [anim]);

  const next = () => {
    if (pos === total) {
      // 복제 첫 장면에 서 있으면(움직임이 끝나기 전에 또 누름) 진짜 첫 장면으로 옮긴 뒤 두 번째로
      after.current = 1;
      setAnim(false);
      setPos(0);
    } else if (pos === total - 1) setPos(reducedMotion() ? 0 : total);
    else setPos(pos + 1);
  };
  const prev = () => {
    if (pos === 0 || pos === total) {
      if (reducedMotion()) return setPos(total - 1);
      // 복제 첫 장면 자리로 몰래 옮긴 뒤 마지막 장면으로 움직여 간다
      after.current = total - 1;
      setAnim(false);
      setPos(total);
    } else setPos(pos - 1);
  };
  const go = (n: number) => setPos(n);
  // 복제 장면에 도착하면 움직임 없이 진짜 첫 장면으로
  const onEnd = () => {
    if (pos === total) {
      setAnim(false);
      setPos(0);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else return;
    e.preventDefault();
  };
  const key = startSlides[cur];
  const text = copy.start.slides[key];

  return (
    <div className={s.carousel} role="region" aria-roledescription="carousel" aria-label={copy.start.slidesLabel} onKeyDown={onKey}>
      <div className={s.viewport}>
        <ul className={anim ? s.track : `${s.track} ${s.still}`} style={{ ['--cur' as string]: pos }} onTransitionEnd={(e) => e.target === e.currentTarget && onEnd()}>
          {[...startSlides, startSlides[0]].map((k, i) => (
            <li
              key={i}
              className={i === pos ? `${s.slide} ${s.on}` : s.slide}
              aria-hidden={i !== pos}
              // 옆에 살짝 보이는 장면을 누르면 그 장면으로
              onClick={i !== pos ? () => (i === pos + 1 ? next() : go(i % total)) : undefined}
            >
              <SlideArt k={k} />
            </li>
          ))}
        </ul>
      </div>
      <div className={s.bar}>
        <div className={s.caption}>
          <h3>{text.title}</h3>
          <p>{text.body}</p>
        </div>
        <div className={s.dots}>
          {startSlides.map((k, i) => (
            <button key={k} type="button" className={i === cur ? `${s.dot} ${s.dotOn}` : s.dot} aria-label={copy.start.goTo(i + 1)} aria-current={i === cur || undefined} onClick={() => go(i)} />
          ))}
        </div>
        <div className={s.arrows}>
          <button type="button" className={s.arrow} aria-label={copy.start.prev} onClick={prev}>
            <Icon name="chevronLeft" size={20} />
          </button>
          <button type="button" className={s.arrow} aria-label={copy.start.next} onClick={next}>
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
      </div>
      <p className={s.srOnly} aria-live="polite">
        {copy.start.position(cur + 1, total)}: {text.title}
      </p>
    </div>
  );
}

/** 장면 그림: 같은 그림을 흐리게 깔아 칸을 채우고, 가운데에 원래 그림을 또렷하게(그림 원본이 작아서). 우주 지도는 별자리 그림 */
function SlideArt({ k }: { k: StartSlide }) {
  if (k === 'map') {
    return (
      <div className={`${s.panel} ${s.sky}`}>
        <ConstellationArt />
      </div>
    );
  }
  const a = art.feature[k];
  return (
    <div className={s.panel} style={{ ['--bg' as string]: `url(${a.src})` }}>
      <ArtImage art={a} className={s.art} />
    </div>
  );
}
