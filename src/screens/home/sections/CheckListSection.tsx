import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '../../../config/copy';
import { unreviewedCount } from '../../../features/ai/review';
import { forgottenItems } from '../../../features/foreshadow/useSlump';
import { useWorkData } from '../../../features/works/workData';
import { SlumpButton } from '../../shared/SlumpButton';
import { StuckSceneSection } from './StuckSceneSection';
import { TodaySuggestionSection } from './TodaySuggestionSection';
import s from './workroom.module.css';

/**
 * 작업실 오른쪽(시안 보완): 상자 없이 제목 · 가는 수평선 · 금색 작은 별로 나눈다.
 * - 이어서 살펴볼 이야기: 오래 잊힌 복선 2개(제목 + 설명 한두 줄, 누르면 그 복선의 가이드)
 * - 정리 결과 검토: 확인 전 AI 추정 수 + 검토하기
 * - 보조: 설정 충돌(있을 때) · 이어서 구상하기(한 줄 제안·막혔어요·막힌 장면 풀기)
 */
export function CheckListSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const [plan, setPlan] = useState(false);
  if (!data) return null;
  const ai = unreviewedCount(data);
  const stories = forgottenItems(data.items.filter((i) => i.kind === 'foreshadow')).slice(0, 2);
  const conflicts = data.issues.filter((i) => i.status === 'open').length;

  return (
    <div className={s.side}>
      <section aria-labelledby="stories-title">
        <h2 id="stories-title" className={s.sideTitle}>
          {copy.home.storiesTitle}
        </h2>
        {stories.length === 0 ? (
          <p className={s.muted}>{copy.home.storiesEmpty}</p>
        ) : (
          <ul className={s.stories}>
            {stories.map((i) => (
              <li key={i.id}>
                <Link to={`/w/${workId}/forgot?item=${i.id}`} className={s.story}>
                  <span className={s.goldStar} aria-hidden="true">
                    ✦
                  </span>
                  <span>
                    <strong>{i.name}</strong>
                    <span className={s.storyNote}>{i.note || copy.home.storyNoNote(i.gap)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="review-title">
        <h2 id="review-title" className={s.sideTitle}>
          {copy.home.reviewTitle}
        </h2>
        <p className={s.reviewRow}>
          <span className={ai > 0 ? s.dotOn : s.dotOff} aria-hidden="true" />
          <span>{copy.home.reviewCount(ai)}</span>
          <Link to={`/w/${workId}/review`} className={s.reviewGo}>
            {copy.home.reviewGo} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>

      <section aria-labelledby="more-title" className={s.moreBox}>
        <h2 id="more-title" className={s.srOnly}>
          {copy.home.moreTitle}
        </h2>
        {conflicts > 0 && (
          <Link to={`/w/${workId}/bible#conflicts`} className={s.moreLink}>
            {copy.home.checkConflicts(conflicts)} <span aria-hidden="true">→</span>
          </Link>
        )}
        <button type="button" className={s.planToggle} aria-expanded={plan} aria-controls="plan-panel" onClick={() => setPlan(!plan)}>
          <span>
            <strong>{copy.home.plan}</strong>
            <span className={s.storyNote}>{copy.home.planSub}</span>
          </span>
          <span aria-hidden="true">{plan ? '▴' : '▾'}</span>
        </button>
        {plan && (
          <div id="plan-panel" className={s.plan}>
            <TodaySuggestionSection workId={workId} />
            {data.episodes.length > 0 && <SlumpButton workId={workId} size="md" />}
            <StuckSceneSection workId={workId} />
          </div>
        )}
      </section>
    </div>
  );
}
