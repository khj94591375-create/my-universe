import { copy } from '../config/copy';
import { setTheme, useTheme } from '../features/theme/theme';
import { Icon } from './Icon';
import s from './ThemeToggle.module.css';

/** 라이트·다크 전환 버튼. 고른 모드는 이 기기에 기억된다. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const toDark = theme === 'light';
  return (
    <button
      type="button"
      className={className ? `${s.toggle} ${className}` : s.toggle}
      onClick={() => setTheme(toDark ? 'dark' : 'light')}
      title={toDark ? copy.theme.toDarkLabel : copy.theme.toLightLabel}
    >
      <Icon name={toDark ? 'moon' : 'sun'} size={16} />
      {toDark ? copy.theme.toDark : copy.theme.toLight}
    </button>
  );
}
