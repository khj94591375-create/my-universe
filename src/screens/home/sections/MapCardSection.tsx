import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StarMapPreview } from '../../../components/StarMapPreview';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { starState } from '../../../features/map/stars';
import { useWorkData } from '../../../features/works/workData';
import s from './workroom.module.css';

/** 작업실 왼쪽: 실제 데이터로 그린 우주 지도 미리보기 + 별·관계 수 + [우주 지도 열기] */
export function MapCardSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  const links = useMemo(() => (data ? data.links.filter((l) => l.kind !== 'co_occur' || l.weight >= limits.mapCoOccurMin) : []), [data]);
  if (!data) return null;
  const mapUrl = `/w/${workId}/map`;
  const maxGap = Math.max(0, ...data.items.map((i) => i.gap ?? 0));
  const faded = data.items.filter((i) => starState(i, maxGap).forgotten).length;
  return (
    <section className={s.mapCard} aria-labelledby="map-card-title">
      <div className={s.mapHead}>
        <h2 id="map-card-title" className={s.cardHead}>
          {copy.home.mapTitle}
        </h2>
        <span className={s.muted}>{copy.home.mapStats(data.items.length, links.length, faded)}</span>
        <Link to={mapUrl} className={s.headLink}>
          {copy.home.mapOpen}
        </Link>
      </div>
      {/* 미리보기를 눌러도 지도로 간다(키보드는 위 링크로) */}
      <div className={s.mapPreview} onClick={() => nav(mapUrl)}>
        <StarMapPreview items={data.items} links={links} label={copy.universe.previewLabel(data.items.length, links.length)} />
      </div>
    </section>
  );
}
