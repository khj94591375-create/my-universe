import { useParams, useSearchParams } from 'react-router-dom';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { EmptyState } from '../../components/EmptyState';
import { copy } from '../../config/copy';
import { useWorkData } from '../../features/works/workData';
import { SlumpButton } from '../shared/SlumpButton';
import { WorkDataGate } from '../shared/WorkDataGate';
import { ForgotListSection } from './sections/ForgotListSection';
import { GuidePanelSection } from './sections/GuidePanelSection';

/** 잊힌 복선 찾기(BUILD_SPEC 6.6). 왼쪽 목록 + 오른쪽 가이드. 선택한 항목은 주소의 ?item= 으로 기억한다. */
export default function ForgotScreen() {
  const { workId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selected = params.get('item');
  const select = (id: string) =>
    setParams((p) => {
      p.set('item', id);
      return p;
    });
  const { data } = useWorkData(workId);
  return (
    <ScreenLayout eyebrow={copy.forgot.eyebrow} title={copy.forgot.title} action={<SlumpButton workId={workId} size="md" />}>
      <WorkDataGate workId={workId}>
        {() =>
          data && data.items.length === 0 ? (
            <EmptyState title={copy.forgot.empty} />
          ) : (
            <Columns ratio="1.2fr 1fr">
              <Column>
                <ForgotListSection workId={workId} selectedId={selected} onSelect={select} />
              </Column>
              <Column>
                <GuidePanelSection workId={workId} itemId={selected} />
              </Column>
            </Columns>
          )
        }
      </WorkDataGate>
    </ScreenLayout>
  );
}
