import { ArtImage } from '../../components/ArtImage';
import { art } from '../../config/art';
import s from './WorksScreen.module.css';

/**
 * 책 모양 표지. 작품 표지가 따로 없으므로 기본 표지 그림(글자 없음) 위에 작품명·장르를 실제 글자로 얹는다.
 * 장식이라 화면 낭독기는 건너뛴다(제목은 카드 아래에 다시 나온다).
 */
export function BookCover({ title, genre, small }: { title: string; genre: string | null; small?: boolean }) {
  return (
    <div className={small ? `${s.cover} ${s.coverSmall}` : s.cover} aria-hidden="true">
      <ArtImage art={art.cover} className={s.coverArt} />
      <div className={s.coverText}>
        <span className={s.coverTitle}>{title}</span>
        {genre && !small && <span className={s.coverGenre}>{genre}</span>}
      </div>
    </div>
  );
}
