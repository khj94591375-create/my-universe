/**
 * 작품 안 메뉴. 순서·이름·아이콘을 바꾸려면 이 배열만 고친다. [변경 가능]
 * path는 /w/:workId/ 뒤에 붙는 주소다.
 */
import type { IconName } from '../components/Icon';

export type NavItem = { path: string; label: string; icon: IconName; stage: string };

export const workNav: NavItem[] = [
  { path: 'home', label: '내 우주 홈', icon: 'home', stage: 'M2' },
  { path: 'upload', label: '원고 불러오기', icon: 'upload', stage: 'M3' },
  { path: 'review', label: '정리 결과 검토', icon: 'review', stage: 'M3' },
  { path: 'forgot', label: '잊힌 복선 찾기', icon: 'sparkles', stage: 'M2' },
  { path: 'map', label: '우주 지도', icon: 'orbit', stage: 'M2' },
  { path: 'bible', label: '설정집', icon: 'people', stage: 'M2' },
  { path: 'episodes', label: '회차 기록', icon: 'layers', stage: 'M2' },
  { path: 'studio', label: '삽화 스튜디오', icon: 'image', stage: 'M6' },
];
