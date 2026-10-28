import { Button } from '../../../components/Button';
import { copy } from '../../../config/copy';
import { confirmAllAi } from '../../../data/items';
import { unreviewedCount } from '../../../features/ai/review';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';

/** "AI 추정 모두 확정"(회수 추정은 상태가 바뀌므로 하나씩 눌러야 한다). */
export function ConfirmAllButton({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const pending = data ? unreviewedCount(data) - data.appearances.filter((a) => a.source === 'ai' && a.role === 'resolve').length : 0;
  return (
    <Button
      variant="ghost"
      disabled={!canWrite || pending === 0}
      title={pending === 0 ? copy.review.noneAi : undefined}
      onClick={() => data && save(workId, () => confirmAllAi(workId, data.items.map((i) => i.id)), copy.review.confirmedAll)}
    >
      {copy.review.confirmAllAi}
      {pending > 0 && ` (${pending})`}
    </Button>
  );
}
