import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ButtonLink } from '../../../components/Button';
import { StarMapPreview } from '../../../components/StarMapPreview';
import { StarShape } from '../../../components/StarShape';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { starState } from '../../../features/map/stars';
import { useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './universe.module.css';

/**
 * 홈의 대표 영역: 나의 우주 지도. 실제 등록된 별·관계로 미리보기를 그리고,
 * 별이 없으면 우주 지도를 처음 만드는 방법을 안내한다.
 */
export function UniverseMapSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const nav = useNavigate();
  const links = useMemo(() => (data ? data.links.filter((l) => l.kind !== 'co_occur' || l.weight >= limits.mapCoOccurMin) : []), [data]);
  if (!data) return null;
  const mapUrl = `/w/${workId}/map`;

  if (data.items.length === 0) {
    return (
      <section className={`${s.hero} ${s.empty}`} aria-labelledby="universe-title">
        <div className={s.text}>
          <p className={s.eyebrow}>{copy.universe.eyebrow}</p>
          <h2 id="universe-title" className={s.title}>
            {copy.universe.emptyTitle}
          </h2>
          <ol className={s.steps}>
            {copy.universe.emptySteps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <div className={s.actions}>
            <ButtonLink to={`/w/${workId}/bible`} size="lg">
              {copy.universe.emptyAction}
            </ButtonLink>
            <ButtonLink to={`/w/${workId}/upload`} variant="ghost" size="lg">
              {copy.universe.emptyUpload}
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const maxGap = Math.max(0, ...data.items.map((i) => i.gap ?? 0));
  const count = (k: string) => data.items.filter((i) => i.kind === k).length;
  const states = data.items.map((i) => starState(i, maxGap));
  const faded = states.filter((st) => st.forgotten).length;
  const done = states.filter((st) => st.done).length;
  const relCount = links.length;

  return (
    <section className={s.hero} aria-labelledby="universe-title">
      <div className={s.text}>
        <p className={s.eyebrow}>{copy.universe.eyebrow}</p>
        <h2 id="universe-title" className={s.title}>
          {copy.universe.title(work?.title ?? '')}
        </h2>
        <p className={s.lead}>{copy.universe.lead}</p>
        <ul className={s.stats}>
          <li>
            <strong>{copy.universe.stars(data.items.length)}</strong>
            <span className={s.kinds}>
              <StarShape kind="character" /> <StarShape kind="setting" /> <StarShape kind="foreshadow" /> {copy.universe.kinds(count('character'), count('setting'), count('foreshadow'))}
            </span>
          </li>
          <li>{copy.universe.links(relCount)}</li>
          <li>{copy.universe.faded(faded)}</li>
          <li>{copy.universe.done(done)}</li>
        </ul>
        <div className={s.actions}>
          <ButtonLink to={mapUrl} size="lg">
            {copy.universe.explore} →
          </ButtonLink>
        </div>
      </div>
      {/* 미리보기는 마우스로 눌러도 지도로 간다(키보드는 위 버튼으로) */}
      <div className={s.preview} onClick={() => nav(mapUrl)}>
        <StarMapPreview items={data.items} links={links} label={copy.universe.previewLabel(data.items.length, relCount)} />
      </div>
    </section>
  );
}
