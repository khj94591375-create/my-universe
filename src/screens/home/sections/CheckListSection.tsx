import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../../components/Icon';
import { copy } from '../../../config/copy';
import { unreviewedCount } from '../../../features/ai/review';
import { forgottenItems } from '../../../features/foreshadow/useSlump';
import { useWorkData } from '../../../features/works/workData';
import { SlumpButton } from '../../shared/SlumpButton';
import { StuckSceneSection } from './StuckSceneSection';
import { TodaySuggestionSection } from './TodaySuggestionSection';
import s from './workroom.module.css';

/**
 * 작업실 오른쪽 "확인할 내용": 실제 개수와 해당 화면으로 가는 줄.
 * - 확인할 AI 추정 → 정리 결과 검토 · 오래 잊힌 항목 → 잊힌 복선 찾기 · 설정 충돌(있을 때) → 설정집
 * - 이어서 구상하기 → 같은 자리에 구상 패널(한 줄 제안 · 막혔어요 · 막힌 장면 풀기)
 */
export function CheckListSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const [plan, setPlan] = useState(false);
  if (!data) return null;
  const ai = unreviewedCount(data);
  const forgotten = forgottenItems(data.items);
  const conflicts = data.issues.filter((i) => i.status === 'open').length;

  return (
    <section className={s.check} aria-labelledby="check-title">
      <h2 id="check-title" className={s.checkTitle}>
        {copy.home.checkTitle}
      </h2>
      <ul className={s.checkList}>
        <Row to={`/w/${workId}/review`} icon="review" title={copy.home.checkAi(ai)} sub={copy.home.checkAiSub} dim={ai === 0} />
        <Row
          to={`/w/${workId}/forgot`}
          icon="sparkles"
          title={copy.home.checkForgot(forgotten.length)}
          sub={copy.home.checkForgotSub(forgotten.slice(0, 2).map((i) => i.name))}
          dim={forgotten.length === 0}
        />
        {conflicts > 0 && <Row to={`/w/${workId}/bible#conflicts`} icon="people" title={copy.home.checkConflicts(conflicts)} sub={copy.home.checkConflictsSub} />}
        <li>
          <button type="button" className={s.checkRow} aria-expanded={plan} aria-controls="plan-panel" onClick={() => setPlan(!plan)}>
            <Icon name="orbit" size={18} className={s.checkIcon} />
            <span className={s.checkText}>
              <strong>{copy.home.plan}</strong>
              <span>{copy.home.planSub}</span>
            </span>
            <span className={s.chev} aria-hidden="true">
              {plan ? '▴' : '▾'}
            </span>
          </button>
        </li>
      </ul>
      {plan && (
        <div id="plan-panel" className={s.plan}>
          <TodaySuggestionSection workId={workId} />
          {data.episodes.length > 0 && <SlumpButton workId={workId} size="md" />}
          <StuckSceneSection workId={workId} />
        </div>
      )}
    </section>
  );
}

function Row({ to, icon, title, sub, dim }: { to: string; icon: IconName; title: string; sub: string; dim?: boolean }) {
  return (
    <li>
      <Link to={to} className={dim ? `${s.checkRow} ${s.dim}` : s.checkRow}>
        <Icon name={icon} size={18} className={s.checkIcon} />
        <span className={s.checkText}>
          <strong>{title}</strong>
          <span>{sub}</span>
        </span>
        <span className={s.chev} aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}
