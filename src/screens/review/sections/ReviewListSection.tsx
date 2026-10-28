import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { AiBadge, EvidenceQuote, KindTag } from '../../../components/Badges';
import { EmptyState } from '../../../components/EmptyState';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import { deleteAppearance, fetchChunkSeqs } from '../../../data/episodes';
import { updateItem } from '../../../data/items';
import { recomputeCoOccur } from '../../../features/analysis/runRules';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './review.module.css';

/** 회차별 정리 결과: 이름, 종류, 출처, 근거 문장, 회차·장면 + 맞아요/고치기/지우기. */
export function ReviewListSection({ workId, nos }: { workId: string; nos: number[] }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [seqs, setSeqs] = useState<Map<string, number>>(new Map());
  const [removing, setRemoving] = useState<string | null>(null);

  const episodes = data ? data.episodes.filter((e) => nos.length === 0 || nos.includes(e.no)) : [];
  const epKey = episodes.map((e) => `${e.id}:${e.analyzed_at}`).join(',');
  useEffect(() => {
    let alive = true;
    fetchChunkSeqs(episodes.map((e) => e.id)).then(
      (m) => alive && setSeqs(m),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [epKey]);

  if (!data) return null;
  if (episodes.length === 0) return <EmptyState title={copy.review.noEps} />;

  return (
    <>
      {data.items.length === 0 && (
        <Card tone="highlight">
          <p>{copy.review.emptyBible}</p>
          <Link to={`/w/${workId}/bible`} className={s.link}>
            {copy.review.toBible} →
          </Link>
        </Card>
      )}
      {episodes.map((ep) => {
        const apps = data.appearances
          .filter((a) => a.episode_id === ep.id)
          .sort((x, y) => (seqs.get(x.chunk_id ?? '') ?? 99) - (seqs.get(y.chunk_id ?? '') ?? 99));
        // 같은 장면에 함께 나온 쌍(이 회차 안에서)
        const byChunk = new Map<string, Set<string>>();
        for (const a of apps) if (a.chunk_id) byChunk.set(a.chunk_id, (byChunk.get(a.chunk_id) ?? new Set()).add(a.item_id));
        const pairs = new Map<string, number>();
        for (const set of byChunk.values()) {
          const ids = [...set].sort();
          for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.set(`${ids[i]}|${ids[j]}`, (pairs.get(`${ids[i]}|${ids[j]}`) ?? 0) + 1);
        }
        return (
          <Card key={ep.id} title={copy.review.epHead(ep.no, ep.title ?? `${ep.no}화`)}>
            <p className={s.muted}>{copy.review.found(new Set(apps.map((a) => a.item_id)).size)}</p>
            {apps.length === 0 ? (
              <p className={s.muted}>{copy.review.noneFound}</p>
            ) : (
              <ul className={s.rows}>
                {/* 같은 회차 안에서는 항목마다 한 줄로 묶는다(장면 번호는 함께 표시) */}
                {[...new Set(apps.map((a) => a.item_id))].map((itemId) => {
                  const item = data.itemById.get(itemId);
                  if (!item) return null;
                  const mine = apps.filter((a) => a.item_id === itemId);
                  const first = mine[0];
                  const scenes = [...new Set(mine.map((a) => (a.chunk_id ? seqs.get(a.chunk_id) : null)).filter((n): n is number => n != null))];
                  const isAi = mine.some((a) => a.source === 'ai') || !item.confirmed;
                  const key = `${ep.id}|${itemId}`;
                  return (
                    <li key={key} className={s.row}>
                      <div className={s.rowHead}>
                        <strong>{item.name}</strong>
                        <KindTag kind={item.kind} />
                        {isAi ? <AiBadge evidence={first.evidence} /> : <Tag tone="ok">{copy.labels.source[first.source]} · {copy.review.confirmed}</Tag>}
                        <span className={s.muted}>{copy.review.scenes(ep.no, scenes)}</span>
                        {canWrite && (
                          <span className={s.actions}>
                            {isAi && (
                              <Button size="sm" onClick={() => save(workId, () => updateItem(item.id, { confirmed: true }))}>
                                {copy.review.ok}
                              </Button>
                            )}
                            <Link to={`/w/${workId}/bible`} className={s.link}>
                              {copy.review.fix}
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => setRemoving(key)}>
                              {copy.review.remove}
                            </Button>
                          </span>
                        )}
                      </div>
                      <EvidenceQuote text={first.evidence} />
                      {removing === key && (
                        <ConfirmBar
                          message={copy.review.removeConfirm(item.name, ep.no)}
                          confirmLabel={copy.review.remove}
                          cancelLabel={copy.review.cancel}
                          onCancel={() => setRemoving(null)}
                          onConfirm={async () => {
                            await save(
                              workId,
                              async () => {
                                for (const a of mine) await deleteAppearance(a.id);
                                await recomputeCoOccur(workId);
                              },
                              copy.review.removed,
                            );
                            setRemoving(null);
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={s.pairs}>
              <h3>{copy.review.pairsTitle}</h3>
              {pairs.size === 0 ? (
                <p className={s.muted}>{copy.review.pairsNone}</p>
              ) : (
                <div className={s.tags}>
                  {[...pairs].map(([k, n]) => {
                    const [x, y] = k.split('|');
                    return <Tag key={k}>{copy.review.pair(data.itemById.get(x)?.name ?? '', data.itemById.get(y)?.name ?? '', n)}</Tag>;
                  })}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}
