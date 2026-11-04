import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { EmptyState } from '../../components/EmptyState';
import { copy } from '../../config/copy';
import { art } from '../../config/art';
import { useWorkData } from '../../features/works/workData';
import { WorkDataGate } from '../shared/WorkDataGate';
import { MapCanvasSection, type MapFocus } from './sections/MapCanvasSection';
import { DesignPanelSection } from './sections/DesignPanelSection';

/** 우주 지도(BUILD_SPEC 6.7). 고른 별은 주소의 ?sel=id,id 로 기억해 다른 화면에서 바로 넘어올 수 있다. 가리킨 별·관계선·연결 추가 상태는 지도와 패널이 함께 쓴다. */
export default function MapScreen() {
  const { workId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  // 고른 별: 화면 안 상태가 기준이고 주소(?sel=)에 따라 적는다(빠르게 두 번 눌러도 어긋나지 않게)
  const [selected, setSelected] = useState<string[]>(() => (params.get('sel') ?? '').split(',').filter(Boolean));
  useEffect(() => {
    setParams(
      (p) => {
        if (selected.length) p.set('sel', selected.join(','));
        else p.delete('sel');
        return p;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  // 지도 화면을 연 채로 주소가 바뀌면(다른 화면의 ?sel= 링크 등) 그 값을 따른다
  const urlSel = params.get('sel') ?? '';
  useEffect(() => {
    if (urlSel !== selected.join(',')) setSelected(urlSel.split(',').filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSel]);
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const { data } = useWorkData(workId);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [center, setCenter] = useState<{ id: string; n: number } | null>(null);
  const focus: MapFocus = {
    focusId,
    setFocusId,
    linkId,
    setLinkId,
    linkFrom,
    setLinkFrom,
    center,
    centerOn: (id) => setCenter((c) => ({ id, n: (c?.n ?? 0) + 1 })),
  };

  return (
    <ScreenLayout tip="map" eyebrow={copy.map.eyebrow} title={copy.map.title}>
      <WorkDataGate workId={workId}>
        {() =>
          data && data.items.length === 0 ? (
            <EmptyState art={art.emptyCollection} title={copy.map.empty} />
          ) : (
            <Columns ratio="1.75fr 1fr">
              <Column>
                <MapCanvasSection workId={workId} selected={selected} onToggle={toggle} onClear={() => setSelected([])} focus={focus} />
              </Column>
              <Column>
                <DesignPanelSection workId={workId} selected={selected} onRemove={toggle} onClear={() => { setSelected([]); setFocusId(null); setLinkId(null); }} focus={focus} />
              </Column>
            </Columns>
          )
        }
      </WorkDataGate>
    </ScreenLayout>
  );
}
