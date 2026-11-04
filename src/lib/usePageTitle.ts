import { useEffect } from 'react';
import { copy } from '../config/copy';

/** 브라우저 탭 제목: "화면 · 작품 · My Universe" (화면 읽기 프로그램이 지금 위치를 알 수 있게, WCAG 2.4.2) */
export function usePageTitle(...parts: (string | null | undefined)[]) {
  const title = [...parts.filter(Boolean), copy.brand.name].join(' · ');
  useEffect(() => {
    document.title = title;
  }, [title]);
}
