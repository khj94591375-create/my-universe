import { ButtonLink } from '../../../components/Button';
import { copy } from '../../../config/copy';
import { SAMPLE_DEMO_ITEMS } from '../../../config/sample';
import { useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

/** 예시 작품 홈에서만: 핵심 체험(복선 두 개로 다음 회차 설계)으로 바로 가는 버튼. 서가·은열쇠를 고른 우주 지도로 */
export function SampleDemoSection({ workId }: { workId: string }) {
  const { work } = useWork(workId);
  const { data } = useWorkData(workId);
  if (!work?.is_sample || !data || !SAMPLE_DEMO_ITEMS.every((id) => data.itemById.has(id))) return null;
  return (
    <div className={s.demo}>
      <ButtonLink to={`/w/${workId}/map?sel=${SAMPLE_DEMO_ITEMS.join(',')}`} variant="accent" size="lg">
        {copy.home.demoButton(data.next)}
      </ButtonLink>
      <p>{copy.home.demoHint}</p>
    </div>
  );
}
