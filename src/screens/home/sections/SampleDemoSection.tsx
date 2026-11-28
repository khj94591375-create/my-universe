import { ButtonLink } from '../../../components/Button';
import { copy } from '../../../config/copy';
import { SAMPLE_DEMO_ITEMS } from '../../../config/sample';
import { useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';

/** 예시 작품 홈에서만: 핵심 체험(복선 두 개로 다음 회차 설계)으로 바로 가는 버튼. 서가·은열쇠를 고른 우주 지도로 */
export function SampleDemoSection({ workId }: { workId: string }) {
  const { work } = useWork(workId);
  const { data } = useWorkData(workId);
  if (!work?.is_sample || !data || !SAMPLE_DEMO_ITEMS.every((id) => data.itemById.has(id))) return null;
  return (
    // 지도를 밀어내지 않게 머리말의 간결한 버튼으로(설명은 마우스를 올리면)
    <ButtonLink to={`/w/${workId}/map?sel=${SAMPLE_DEMO_ITEMS.join(',')}`} variant="ghost" title={copy.home.demoHint}>
      ✦ {copy.home.demoButton(data.next)}
    </ButtonLink>
  );
}
