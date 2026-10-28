import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { WriteButton } from '../../components/WriteButton';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { SlumpButton } from '../shared/SlumpButton';
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
    <WorkDataGate workId={workId}>
      {(data) =>
        data.episodes.length === 0 ? (
          <EmptyState
            title={copy.home.emptyTitle}
            action={
              <WriteButton workId={workId} variant="accent" onClick={() => nav(`/w/${workId}/upload`)}>
                {copy.home.emptyAction}
              </WriteButton>
            }
          />
        ) : (
          <ScreenLayout eyebrow={copy.home.eyebrow} title={copy.home.nextTitle(data.next)} action={<SlumpButton workId={workId} />}>
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
        )
      }
    </WorkDataGate>
  );
}
