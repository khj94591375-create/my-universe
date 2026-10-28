import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { AiBadge, EvidenceQuote, GapTag, KindTag, StatusTag } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import { setItemStatus } from '../../../data/items';
import type { ItemStatus } from '../../../data/types';
import { templateGuide } from '../../../features/foreshadow/guideTemplate';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import { reuseOf } from './ForgotListSection';
import s from './forgot.module.css';

/** 선택한 항목의 가이드: 시작 문장 예시 + 방향 3개(각각 근거 문장) + 상태 바꾸기(BUILD_SPEC 6.6, 7.8). */
export function GuidePanelSection({ workId, itemId }: { workId: string; itemId: string | null }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const item = itemId && data ? data.itemById.get(itemId) : null;
  if (!data) return null;
  if (!item) {
    return (
      <Card>
        <p className={s.muted}>{copy.forgot.pickHint}</p>
      </Card>
    );
  }

  const guide = templateGuide(item.kind, item.name, item.last_ep);
  const epNo = new Map(data.episodes.map((e) => [e.id, e.no]));
  // 근거 문장: 최근 회차부터, 방향마다 다른 문장
  const evidences = data.appearances
    .filter((a) => a.item_id === item.id)
    .map((a) => ({ text: a.evidence, ep: epNo.get(a.episode_id) ?? null }))
    .sort((x, y) => (y.ep ?? 0) - (x.ep ?? 0));
  const reuse = item.kind === 'foreshadow' && item.status === 'resolved' ? reuseOf(data, item) : null;
  const setStatus = (st: ItemStatus) => save(workId, () => setItemStatus(item.id, st));

  return (
    <Card tone="highlight" className={s.guide}>
      <div className={s.cardHead}>
        <h2 className={s.guideTitle}>{item.name}</h2>
        <KindTag kind={item.kind} />
        <StatusTag status={item.status} />
        <GapTag gap={item.gap} />
        {(item.source === 'ai' || !item.confirmed) && <AiBadge />}
      </div>
      {item.note && <p className={s.muted}>{item.note}</p>}

      <div className={s.block}>
        <div className={s.blockHead}>
          <h3>{copy.forgot.openingLabel(data.next)}</h3>
          <span title={copy.forgot.basicGuideTip}>
            <Tag>{copy.forgot.basicGuide}</Tag>
          </span>
        </div>
        <p className={s.opening}>{guide.opening}</p>
      </div>

      <div className={s.block}>
        <h3>{copy.forgot.directionsLabel}</h3>
        <ol className={s.directions}>
          {guide.directions.map((d, idx) => {
            const ev = evidences.length ? evidences[idx % evidences.length] : null;
            return (
              <li key={d.title}>
                <strong>{d.title}</strong>
                <p>{d.body}</p>
                {ev ? <EvidenceQuote text={ev.text} ep={ev.ep} /> : <p className={s.muted}>{copy.forgot.noEvidence}</p>}
              </li>
            );
          })}
        </ol>
      </div>

      {reuse && (
        <div className={s.block}>
          <h3>
            {copy.forgot.reuseTitle}: {reuse.label}
          </h3>
          <p>{reuse.reason}</p>
          <p className={s.muted}>{copy.forgot.reuseNote}</p>
        </div>
      )}

      <div className={s.actions}>
        {canWrite && item.kind === 'foreshadow' && item.status === 'resolved' && (
          <Button onClick={() => setStatus('reuse_planned')}>{copy.forgot.markReusePlanned}</Button>
        )}
        {canWrite && item.kind === 'foreshadow' && item.status === 'open' && <Button onClick={() => setStatus('resolved')}>{copy.forgot.markResolved}</Button>}
        {canWrite && item.kind === 'foreshadow' && item.status !== 'open' && (
          <Button variant="ghost" onClick={() => setStatus('open')}>
            {copy.forgot.markOpen}
          </Button>
        )}
        <Link to={`/w/${workId}/map?sel=${item.id}`} className={s.linkBtn}>
          {copy.forgot.toMap} →
        </Link>
        <Button variant="ghost" disabled title={copy.forgot.aiLater}>
          {copy.forgot.aiChat}
        </Button>
      </div>
      {!canWrite && <p className={s.muted}>{copy.shell.loginToWrite}</p>}
    </Card>
  );
}
