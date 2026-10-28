import { useParams, useSearchParams } from 'react-router-dom';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { EmptyState } from '../../components/EmptyState';
import { copy } from '../../config/copy';
import { useWorkData } from '../../features/works/workData';
import { WorkDataGate } from '../shared/WorkDataGate';
import { MapCanvasSection } from './sections/MapCanvasSection';
import { DesignPanelSection } from './sections/DesignPanelSection';

/** 우주 지도(BUILD_SPEC 6.7). 고른 별은 주소의 ?sel=id,id 로 기억해 다른 화면에서 바로 넘어올 수 있다. */
export default function MapScreen() {
  const { workId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selected = (params.get('sel') ?? '').split(',').filter(Boolean);
  const setSelected = (ids: string[]) =>
    setParams(
      (p) => {
        if (ids.length) p.set('sel', ids.join(','));
        else p.delete('sel');
        return p;
      },
      { replace: true },
    );
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const { data } = useWorkData(workId);

  return (
    <ScreenLayout eyebrow={copy.map.eyebrow} title={copy.map.title}>
      <WorkDataGate workId={workId}>
        {() =>
          data && data.items.length === 0 ? (
            <EmptyState title={copy.map.empty} />
          ) : (
            <Columns ratio="1.75fr 1fr">
              <Column>
                <MapCanvasSection workId={workId} selected={selected} onToggle={toggle} />
              </Column>
              <Column>
                <DesignPanelSection workId={workId} selected={selected} onRemove={toggle} />
              </Column>
            </Columns>
          )
        }
      </WorkDataGate>
    </ScreenLayout>
  );
}
