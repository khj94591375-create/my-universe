import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { ReviewListSection } from './sections/ReviewListSection';
import s from './sections/review.module.css';

/** 정리 결과 검토(BUILD_SPEC 6.5). ?eps=7,8 의 회차만 보여 준다. 검토하지 않아도 다른 화면은 정상 동작한다. */
export default function ReviewScreen() {
  const { workId = '' } = useParams();
  const [params] = useSearchParams();
  const nos = (params.get('eps') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return (
    <ScreenLayout
      eyebrow={copy.review.eyebrow}
      title={copy.review.title}
      action={
        <Button variant="ghost" disabled title={copy.review.aiLater}>
          {copy.review.confirmAllAi}
        </Button>
      }
    >
      <p className={s.lead}>{copy.review.lead}</p>
      <WorkDataGate workId={workId}>{() => <ReviewListSection workId={workId} nos={nos} />}</WorkDataGate>
      <div className={s.footer}>
        <Link to={`/w/${workId}/home`}>{copy.review.toHome}</Link>
        <Link to={`/w/${workId}/episodes`}>{copy.review.toEpisodes}</Link>
      </div>
    </ScreenLayout>
  );
}
