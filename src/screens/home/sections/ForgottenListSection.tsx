import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { GapTag, KindTag } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { forgottenItems } from '../../../features/foreshadow/useSlump';
import { useWorkData } from '../../../features/works/workData';
import s from './sections.module.css';

/** 오래 잊힌 항목 최대 4개: 이름, 종류, GapTag, 설명, 가이드 보기. */
export function ForgottenListSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const list = data ? forgottenItems(data.items).slice(0, limits.homeForgottenCount) : [];
  return (
    <Card title={copy.home.forgottenTitle}>
      {list.length === 0 ? (
        <p className={s.placeholder}>{copy.home.forgottenEmpty}</p>
      ) : (
        <ul className={s.list}>
          {list.map((i) => (
            <li key={i.id} className={s.row}>
              <div className={s.rowMain}>
                <div className={s.rowHead}>
                  <strong>{i.name}</strong>
                  <KindTag kind={i.kind} />
                  <GapTag gap={i.gap} />
                </div>
                {i.note && <p className={s.note}>{i.note}</p>}
              </div>
              <Link to={`/w/${workId}/forgot?item=${i.id}`} className={s.rowLink}>
                {copy.home.guide}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
