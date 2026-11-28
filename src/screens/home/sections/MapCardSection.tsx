import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MAP_HOME, StarMap } from '../../../components/StarMap';
import { StarShape } from '../../../components/StarShape';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import type { ItemKind } from '../../../data/types';
import { aiResolveEps } from '../../../features/map/stars';
import { useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './workroom.module.css';

const KINDS: ItemKind[] = ['character', 'setting', 'foreshadow'];

/**
 * 작업실 왼쪽: 실제 데이터로 그린 "나의 우주"(약 1.6:1). 우주 지도와 같은 밤하늘·발광 노드·가는 곡선.
 * 위: ✦ 나의 우주 · 크게 보기 / 아래: 종류 범례 · 우주 지도 열기. 별을 누르면 그 별을 고른 우주 지도로.
 */
export function MapCardSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const links = useMemo(() => (data ? data.links.filter((l) => l.kind !== 'co_occur' || l.weight >= limits.mapCoOccurMin) : []), [data]);
  const aiResolve = useMemo(() => (data ? aiResolveEps(data.appearances, data.episodes) : undefined), [data]);
  if (!data) return null;
  const mapUrl = `/w/${workId}/map`;
  return (
    <section className={s.universe} aria-labelledby="universe-title">
      <div className={s.universeTop}>
        <h2 id="universe-title" className={s.universeTitle}>
          <span className={s.goldStar} aria-hidden="true">
            ✦
          </span>
          {copy.home.universeTitle}
        </h2>
        <Link to={`${mapUrl}?expand=1`} className={s.universeLink}>
          {copy.home.expand}
        </Link>
      </div>
      <div className={s.universeMap}>
        <StarMap
          title={work?.title ?? ''}
          items={data.items}
          links={links}
          selected={new Set()}
          focusId={null}
          onStar={(id) => nav(`${mapUrl}?sel=${id}`)}
          aiResolve={aiResolve}
          view={MAP_HOME}
          onView={() => undefined}
          preview
          previewLabel={copy.universe.previewLabel(data.items.length, links.length)}
        />
      </div>
      <div className={s.universeBottom}>
        <ul className={s.legend} aria-label={copy.home.legend}>
          {KINDS.map((k) => (
            <li key={k}>
              <StarShape kind={k} size={13} /> {copy.labels.kind[k]}
            </li>
          ))}
        </ul>
        <Link to={mapUrl} className={s.universeLink}>
          {copy.home.mapOpen} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
