import { copy } from '../config/copy';
import { setTheme, useTheme } from '../features/theme/theme';
import { Icon } from './Icon';
import s from './ThemeToggle.module.css';

/** 라이트·다크 전환 버튼. 고른 모드는 이 기기에 기억된다. */
export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const theme = useTheme();
  const toDark = theme === 'light';
  const label = toDark ? copy.theme.toDarkLabel : copy.theme.toLightLabel;
  if (compact) {
    // 아이콘만: 이름은 aria-label로, 마우스를 올리면 같은 글이 보인다
    return (
      <button
        type="button"
        className={className ? `${s.toggle} ${s.compact} ${className}` : `${s.toggle} ${s.compact}`}
        onClick={() => setTheme(toDark ? 'dark' : 'light')}
        aria-label={label}
        title={label}
      >
        <Icon name={toDark ? 'moon' : 'sun'} size={17} />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={className ? `${s.toggle} ${className}` : s.toggle}
      onClick={() => setTheme(toDark ? 'dark' : 'light')}
      title={label}
    >
      <Icon name={toDark ? 'moon' : 'sun'} size={16} />
      {toDark ? copy.theme.toDark : copy.theme.toLight}
    </button>
  );
}
