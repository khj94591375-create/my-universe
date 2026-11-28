/**
 * 화면에 쓰는 그림(일러스트). [변경 가능]
 * 그림을 바꾸려면 src/assets/art/ 의 파일을 같은 이름으로 바꾸거나, 아래 연결만 고친다.
 * 원본은 my-universe-assets(PNG)이고, 가볍게 WebP로 바꾸면서 둥근 모서리 밖을 투명하게 했다.
 * 그림 속에는 글자가 없다. 제목·버튼은 언제나 실제 글자로 둔다.
 */
import heroLight from '../assets/art/hero-light.webp';
import heroDark from '../assets/art/hero-dark.webp';
import dashLight from '../assets/art/dashboard-light.webp';
import dashDark from '../assets/art/dashboard-dark.webp';
import featWriting from '../assets/art/feature-writing.webp';
import featForeshadow from '../assets/art/feature-foreshadowing.webp';
import featWorld from '../assets/art/feature-worldbuilding.webp';
import featImage from '../assets/art/feature-image.webp';
import featGuide from '../assets/art/feature-story-guide.webp';
import emptyCollection from '../assets/art/empty-collection.webp';
import emptyAnalysis from '../assets/art/empty-analysis.webp';
import loading from '../assets/art/loading.webp';
// 2026-11-28 디자인 키트 그림(글자 없음): 기본 책 표지 · 원고 없음 · 갤러리 비어 있음 · 지도 배경 안개
import kitCover from '../assets/art/kit-cover.webp';
import kitEmptyManuscript from '../assets/art/kit-empty-manuscript.webp';
import kitEmptyGallery from '../assets/art/kit-empty-gallery.webp';
import kitMapAtmosphere from '../assets/art/kit-map-atmosphere.webp';

export type Art = { src: string; width: number; height: number };
/** 밝은 화면·어두운 화면용 한 쌍(기기의 화면 모드에 맞춰 자동으로 바뀐다) */
export type ThemedArt = { light: Art; dark: Art };

export const art = {
  hero: { light: { src: heroLight, width: 744, height: 281 }, dark: { src: heroDark, width: 745, height: 281 } } satisfies ThemedArt,
  dashboard: { light: { src: dashLight, width: 744, height: 167 }, dark: { src: dashDark, width: 745, height: 168 } } satisfies ThemedArt,
  feature: {
    writing: { src: featWriting, width: 295, height: 174 },
    foreshadowing: { src: featForeshadow, width: 281, height: 174 },
    worldbuilding: { src: featWorld, width: 286, height: 174 },
    image: { src: featImage, width: 286, height: 174 },
    storyGuide: { src: featGuide, width: 282, height: 174 },
  } satisfies Record<string, Art>,
  emptyCollection: { src: emptyCollection, width: 347, height: 176 } satisfies Art,
  emptyAnalysis: { src: emptyAnalysis, width: 342, height: 176 } satisfies Art,
  loading: { src: loading, width: 340, height: 176 } satisfies Art,
  /** 표지가 없는 작품 카드(2:3, 제목은 HTML로 위에 얹는다) */
  cover: { src: kitCover, width: 480, height: 720 } satisfies Art,
  emptyManuscript: { src: kitEmptyManuscript, width: 480, height: 320 } satisfies Art,
  emptyGallery: { src: kitEmptyGallery, width: 440, height: 402 } satisfies Art,
  /** 지도 배경(별·선 없는 남색 안개) */
  mapAtmosphere: { src: kitMapAtmosphere, width: 1536, height: 1024 } satisfies Art,
};

export type FeatureArt = keyof typeof art.feature;

/** 시작 화면: 기능 소개 넘기기 순서('map'은 그림 대신 별자리 그림) */
export type StartSlide = 'writing' | 'map' | 'worldbuilding' | 'foreshadowing' | 'image';
export const startSlides: StartSlide[] = ['writing', 'map', 'worldbuilding', 'foreshadowing', 'image'];
