/**
 * 기능 아이콘(SVG). 디자인 참고: my-universe-assets/icons-reference.png(둥근 선 아이콘).
 * 글자 색(currentColor)을 따르므로 색은 쓰는 곳의 CSS 토큰으로 정한다.
 */
export type IconName = 'home' | 'upload' | 'review' | 'sparkles' | 'orbit' | 'people' | 'layers' | 'image' | 'settings' | 'user' | 'logout';

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9v11h5v-6h3v6h5V9" />
    </>
  ),
  upload: (
    <>
      <path d="M7 18.5H6.5a4 4 0 0 1-.4-7.98A6 6 0 0 1 17.7 9a4.5 4.5 0 0 1-.2 9.5H17" />
      <path d="M12 21v-8.5" />
      <path d="m8.8 15.2 3.2-3.2 3.2 3.2" />
    </>
  ),
  review: (
    <>
      <path d="M9 3.5h6v3H9z" />
      <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16" />
      <path d="m9 13.5 2.2 2.2L15.5 11.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 3.5 11.7 8.3 16.5 10l-4.8 1.7L10 16.5l-1.7-4.8L3.5 10l4.8-1.7z" />
      <path d="M18 14.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-28 12 12)" />
      <circle cx="19.2" cy="5.6" r="1" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.3" />
      <path d="M3.5 20c0-3.3 2.4-5.6 5.5-5.6s5.5 2.3 5.5 5.6" />
      <path d="M15.5 4.9a3.3 3.3 0 0 1 0 6.2" />
      <path d="M17.3 14.7c1.9.7 3.2 2.6 3.2 5.3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5 3 8l9 4.5L21 8z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16 9 4.5 9-4.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.8" cy="9.3" r="1.7" />
      <path d="m21 15.5-4.8-4.8L7 20" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" />
      <circle cx="12" cy="12" r="6.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h4" />
      <path d="m15 8 4 4-4 4" />
      <path d="M19 12H9.5" />
    </>
  ),
};

/** 장식용 아이콘(화면 읽기 프로그램은 옆의 글자를 읽는다). */
export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
