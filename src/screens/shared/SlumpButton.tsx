import { Button } from '../../components/Button';
import { copy } from '../../config/copy';
import { useSlump } from '../../features/foreshadow/useSlump';

/** 막혔어요! 하나 골라주세요(금색, 최우선 행동). 어느 화면에 두어도 같은 동작. */
export function SlumpButton({ workId, size = 'lg' }: { workId: string; size?: 'md' | 'lg' }) {
  const pick = useSlump(workId);
  return (
    <Button variant="accent" size={size} onClick={pick}>
      {copy.home.slumpButton}
    </Button>
  );
}
