/** 메뉴·작은 자리용 간소화 심볼(U + 궤도 + 별). 큰 자리에는 public/logo.png를 쓴다. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M11 9v12a9 9 0 0 0 18 0V12" fill="none" stroke="var(--c-cream)" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="20" cy="23" rx="17" ry="4.5" fill="none" stroke="var(--c-gold)" strokeWidth="1.6" />
      <path d="M31 2c.4 4 2 5.6 6 6-4 .4-5.6 2-6 6-.4-4-2-5.6-6-6 4-.4 5.6-2 6-6z" fill="var(--c-gold)" />
    </svg>
  );
}
