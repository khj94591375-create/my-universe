import { Button } from '../../components/Button';
import { copy } from '../../config/copy';
import { useSlump } from '../../features/foreshadow/useSlump';

/** 잊힌 항목 하나 골라 주기(보조 버튼: 금색은 화면마다 가장 중요한 행동 하나에만). 어느 화면에 두어도 같은 동작. */
export function SlumpButton({ workId, size = 'lg' }: { workId: string; size?: 'md' | 'lg' }) {
  const pick = useSlump(workId);
  return (
    <Button variant="ghost" size={size} onClick={pick}>
      {copy.home.slumpButton}
    </Button>
  );
}
