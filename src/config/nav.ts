/**
 * 작품 안 메뉴(상단 다섯 메뉴 · 휴대폰 하단 탐색). 순서·이름·아이콘을 바꾸려면 이 배열만 고친다. [변경 가능]
 * path는 /w/:workId/ 뒤에 붙는 주소, match는 이 메뉴를 "선택됨"으로 보는 주소들(하위 탭 포함).
 * 예전 주소(upload·review·episodes·forgot 등)는 그대로 열리고, 해당 메뉴가 선택된 것으로 보인다.
 */
import type { IconName } from '../components/Icon';

export type NavItem = { path: string; label: string; short: string; icon: IconName; match: string[] };

export const workNav: NavItem[] = [
  { path: 'home', label: '작업실', short: '작업실', icon: 'home', match: ['home', 'forgot'] },
  { path: 'map', label: '우주 지도', short: '지도', icon: 'orbit', match: ['map'] },
  { path: 'episodes', label: '원고', short: '원고', icon: 'layers', match: ['episodes', 'upload', 'review'] },
  { path: 'bible', label: '설정집', short: '설정집', icon: 'people', match: ['bible'] },
  { path: 'studio', label: '삽화', short: '삽화', icon: 'image', match: ['studio'] },
];

/** 원고 메뉴의 하위 탭 */
export const manuscriptTabs: { path: string; label: string }[] = [
  { path: 'episodes', label: '회차 기록' },
  { path: 'upload', label: '원고 불러오기' },
  { path: 'review', label: '정리 결과 검토' },
];
