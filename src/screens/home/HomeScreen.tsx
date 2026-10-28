import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { ForgottenListSection } from './sections/ForgottenListSection';
import { TodaySuggestionSection } from './sections/TodaySuggestionSection';
import { ResolveProgressSection } from './sections/ResolveProgressSection';
import { RecentUploadsSection } from './sections/RecentUploadsSection';

/**
 * 내 우주 홈(BUILD_SPEC 6.3).
 * 배치를 바꾸려면 아래 섹션의 순서·칸만 옮기면 된다. 각 섹션은 workId만 받아 스스로 데이터를 가져온다.
 */
export default function HomeScreen() {
  const { workId = '' } = useParams();
  const nav = useNavigate();
  return (
    <ScreenLayout
      eyebrow={copy.home.eyebrow}
      title="다음 회차를 이어 써 볼까요"
      action={
        <Button variant="accent" size="lg" onClick={() => nav(`/w/${workId}/forgot`)}>
          {copy.home.slumpButton}
        </Button>
      }
    >
      <Columns>
        <Column>
          <ForgottenListSection workId={workId} />
          <TodaySuggestionSection workId={workId} />
        </Column>
        <Column>
          <ResolveProgressSection workId={workId} />
          <RecentUploadsSection workId={workId} />
        </Column>
      </Columns>
    </ScreenLayout>
  );
}
