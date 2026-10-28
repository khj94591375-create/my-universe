import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './episodes.module.css';

/** 회차 목록: 번호, 제목, 요약, 등장 항목, 글자 수, 정리 상태. */
export function EpisodeListSection({ workId, openNo, onOpen }: { workId: string; openNo: number | null; onOpen: (no: number) => void }) {
  const { data } = useWorkData(workId);
  if (!data) return null;
  if (data.episodes.length === 0) return <EmptyState title={copy.episodes.empty} />;
  return (
    <Card>
      <ul className={s.list}>
        {[...data.episodes].reverse().map((e) => {
          const ids = [...new Set(data.appearances.filter((a) => a.episode_id === e.id).map((a) => a.item_id))];
          const items = ids.map((id) => data.itemById.get(id)).filter((i) => i != null);
          return (
            <li key={e.id} className={e.no === openNo ? `${s.row} ${s.rowOpen}` : s.row}>
              <button type="button" className={s.rowBtn} onClick={() => onOpen(e.no)} aria-expanded={e.no === openNo}>
                <span className={s.no}>{e.no}화</span>
                <span className={s.rowMain}>
                  <strong>{e.title ?? `${e.no}화`}</strong>
                  <span className={s.muted}>{e.summary ?? copy.episodes.noSummary}</span>
                  <span className={s.tags}>
                    {items.map((i) => (
                      <Tag key={i.id}>{i.name}</Tag>
                    ))}
                  </span>
                </span>
                <span className={s.side}>
                  <span className={s.muted}>{copy.episodes.chars(e.body.replace(/\n/g, '').length)}</span>
                  <Tag tone={e.analyzed_at ? 'ok' : 'neutral'}>{e.analyzed_at ? copy.episodes.analyzed : copy.episodes.notAnalyzed}</Tag>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
