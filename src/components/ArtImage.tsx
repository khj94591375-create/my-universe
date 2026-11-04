import type { Art, ThemedArt } from '../config/art';
import { useTheme } from '../features/theme/theme';
import s from './ArtImage.module.css';

type Common = { alt?: string; className?: string; eager?: boolean };

/** 일러스트 한 장. 기본은 순수 장식(alt="")이고, 늦게 불러온다. 너비·높이를 적어 화면이 덜컹거리지 않게 한다. */
export function ArtImage({ art, alt = '', className, eager }: Common & { art: Art }) {
  return (
    <img
      src={art.src}
      width={art.width}
      height={art.height}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className ? `${s.art} ${className}` : s.art}
    />
  );
}

/** 밝은·어두운 화면용 일러스트 한 쌍. 지금 화면 모드(라이트/다크 전환 버튼)에 맞춰 바뀐다. */
export function ThemedArtImage({ art, alt = '', className, eager }: Common & { art: ThemedArt }) {
  const theme = useTheme();
  return <ArtImage key={theme} art={art[theme]} alt={alt} className={className} eager={eager} />;
}
