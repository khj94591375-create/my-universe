import { useRef, useState, type KeyboardEvent } from 'react';
import { ArtImage } from '../../components/ArtImage';
import { Icon } from '../../components/Icon';
import { art, startSlides, type StartSlide } from '../../config/art';
import { copy } from '../../config/copy';
import { ConstellationArt } from './ConstellationArt';
import s from './FeatureCarousel.module.css';

/**
 * 시작 화면의 기능 소개: 큰 그림을 한 장씩 넘겨 본다(자동으로 넘어가지 않는다).
 * 지금 장면 옆에 다음 장면이 살짝 보이고, 아래에 제목·설명 한 줄, 점(몇 번째), 이전/다음 버튼. ←/→ 키로도 넘긴다.
 */
export function FeatureCarousel() {
  const [cur, setCur] = useState(0);
  const total = startSlides.length;
  const live = useRef<HTMLParagraphElement>(null);
  const go = (n: number) => setCur(Math.max(0, Math.min(total - 1, n)));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(cur + 1);
    else if (e.key === 'ArrowLeft') go(cur - 1);
    else return;
    e.preventDefault();
  };
  const key = startSlides[cur];
  const text = copy.start.slides[key];

  return (
    <div className={s.carousel} role="region" aria-roledescription="carousel" aria-label={copy.start.slidesLabel} onKeyDown={onKey}>
      <div className={s.viewport}>
        <ul className={s.track} style={{ ['--cur' as string]: cur }}>
          {startSlides.map((k, i) => (
            <li
              key={k}
              className={i === cur ? `${s.slide} ${s.on}` : s.slide}
              aria-hidden={i !== cur}
              // 옆에 살짝 보이는 장면을 누르면 그 장면으로
              onClick={i !== cur ? () => go(i) : undefined}
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
          <button type="button" className={s.arrow} aria-label={copy.start.prev} disabled={cur === 0} onClick={() => go(cur - 1)}>
            <Icon name="chevronLeft" size={20} />
          </button>
          <button type="button" className={s.arrow} aria-label={copy.start.next} disabled={cur === total - 1} onClick={() => go(cur + 1)}>
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
      </div>
      <p ref={live} className={s.srOnly} aria-live="polite">
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
