import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { EmptyState } from '../../components/EmptyState';
import { copy } from '../../config/copy';
import { showToast } from '../../components/Toast';
import s from './MapScreen.module.css';
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
  // 고른 별 비우기(빈 곳·Esc·모두 빼기). 실수로 눌렀을 수 있으니 알림에서 되돌릴 수 있게 한다.
  const clearAll = () => {
    const prev = selected;
    setSelected([]);
    setFocusId(null);
    setLinkId(null);
    if (prev.length) showToast(copy.map.panel.cleared(prev.length), 'info', { label: copy.map.panel.undo, run: () => setSelected(prev) });
  };
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const { data } = useWorkData(workId);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkTo, setLinkTo] = useState<string | null>(null);
  const [center, setCenter] = useState<{ id: string; n: number } | null>(null);
  const focus: MapFocus = {
    focusId,
    setFocusId,
    linkId,
    setLinkId,
    linkFrom,
    setLinkFrom,
    linkTo,
    setLinkTo,
    center,
    centerOn: (id) => setCenter((c) => ({ id, n: (c?.n ?? 0) + 1 })),
  };

  // 지도 크게 보기: 같은 지도를 화면 전체로 키운다(다시 만들지 않아 고른 별·확대·위치 유지)
  const [expanded, setExpanded] = useState(false);
  const mapArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expanded) return;
    // Esc는 먼저 크게 보기를 끈다(고른 별은 그대로)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setExpanded(false);
    };
    window.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 뒤에 가려진 화면(메뉴·패널)은 Tab으로 가지 않게 잠시 비활성(알림은 제외)
    const inerted: Element[] = [];
    for (let el: HTMLElement | null = mapArea.current; el && el.parentElement && el !== document.body; el = el.parentElement)
      for (const sib of el.parentElement.children)
        if (sib !== el && !sib.hasAttribute('inert') && !sib.hasAttribute('aria-live')) {
          sib.setAttribute('inert', '');
          inerted.push(sib);
        }
    mapArea.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      inerted.forEach((x) => x.removeAttribute('inert'));
      document.getElementById('map-expand')?.focus();
    };
  }, [expanded]);

  return (
    <ScreenLayout tip="map" eyebrow={copy.map.eyebrow} title={copy.map.title}>
      <WorkDataGate workId={workId}>
        {() =>
          data && data.items.length === 0 ? (
            <EmptyState art={art.emptyCollection} title={copy.map.empty} />
          ) : (
            <Columns ratio="1.75fr 1fr">
              <Column>
                <div
                  ref={mapArea}
                  className={expanded ? s.expanded : undefined}
                  tabIndex={-1}
                  role={expanded ? 'region' : undefined}
                  aria-label={expanded ? copy.map.expand.region : undefined}
                >
                  <MapCanvasSection workId={workId} selected={selected} onToggle={toggle} onClear={clearAll} focus={focus} expanded={expanded} onExpand={setExpanded} />
                </div>
              </Column>
              <Column>
                <div className={s.sticky} hidden={expanded}>
                <DesignPanelSection workId={workId} selected={selected} onRemove={toggle} onClear={clearAll} focus={focus} />
                </div>
              </Column>
            </Columns>
          )
        }
      </WorkDataGate>
    </ScreenLayout>
  );
}
