import { copy } from '../config/copy';
import { screenTips, tipArt, tipVersion, type TipId } from '../config/guide';
import { art } from '../config/art';
import { ArtImage } from './ArtImage';
import { ALL_TIPS, tipKey } from '../features/guide/guideData';
import { useGuideState, useTourOpen } from '../features/guide/guideState';
import s from './ScreenTip.module.css';

/** 화면별 도움말: 처음 한 번 제목 아래에 보이고, 닫거나 모두 끌 수 있다(내 설정에서 다시 켜기). */
export function ScreenTip({ id }: { id: TipId }) {
  const guide = useGuideState();
  const tourOpen = useTourOpen();
  const key = tipKey(id, tipVersion[id]);
  if (tourOpen || guide.tipSeen(key)) return null;
  return (
    <aside className={s.tip} aria-label={copy.guide.tipLabel}>
      {tipArt[id] ? (
        <ArtImage art={art.feature[tipArt[id]]} className={s.thumb} />
      ) : (
        <span className={s.mark} aria-hidden="true">
          ?
        </span>
      )}
      <p className={s.text}>{screenTips[id]}</p>
      <div className={s.actions}>
        <button type="button" className={s.btn} onClick={() => guide.dismissTip(ALL_TIPS)}>
          {copy.guide.tipAllOff}
        </button>
        <button type="button" className={`${s.btn} ${s.close}`} onClick={() => guide.dismissTip(key)}>
          {copy.guide.tipClose}
        </button>
      </div>
    </aside>
  );
}
