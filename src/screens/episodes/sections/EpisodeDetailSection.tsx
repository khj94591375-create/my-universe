import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { ErrorState } from '../../../components/ErrorState';
import { Loading } from '../../../components/Loading';
import { KindTag } from '../../../components/Badges';
import { TextArea, TextField } from '../../../components/TextField';
import { copy } from '../../../config/copy';
import { toMessage } from '../../../data/errors';
import { deleteAppearances, deleteEpisode, updateEpisode } from '../../../data/episodes';
import { fetchChunks } from '../../../data/workData';
import type { Chunk, ItemView } from '../../../data/types';
import { highlightPieces } from '../../../features/analysis/highlight';
import { addManualAppearance, reanalyzeEpisode, recomputeCoOccur } from '../../../features/analysis/runRules';
import { splitScenes } from '../../../features/analysis/split';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './episodes.module.css';

/** 회차 열기: 원고 전문(장면 구분, 등장 항목 강조), 제목·요약 고치기, 등장 항목 체크, 다시 정리, 삭제. */
export function EpisodeDetailSection({ workId, no, onClose }: { workId: string; no: number; onClose: () => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const episode = data?.episodes.find((e) => e.no === no) ?? null;
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [meta, setMeta] = useState({ title: '', summary: '' });
  const [busy, setBusy] = useState(false);

  const analyzedAt = episode?.analyzed_at;
  useEffect(() => {
    if (!episode) return;
    let alive = true;
    setChunks(null);
    setChunkError(null);
    fetchChunks(episode.id).then(
      (c) => alive && setChunks(c),
      (e) => alive && setChunkError(toMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [episode?.id, analyzedAt]);

  if (!data) return null;
  if (!episode) return null;

  const present = new Set(data.appearances.filter((a) => a.episode_id === episode.id).map((a) => a.item_id));
  // 장면이 아직 없으면(정리 전) 본문을 규칙대로 나눠 보여 준다
  const scenes = chunks && chunks.length ? chunks.map((c) => c.text) : splitScenes(episode.body);

  const toggle = (item: ItemView, on: boolean) =>
    save(workId, async () => {
      if (on) await addManualAppearance(episode, item);
      else await deleteAppearances(item.id, episode.id);
      await recomputeCoOccur(workId);
    });

  const submitMeta = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await save(workId, () => updateEpisode(episode.id, { title: meta.title.trim() || `${episode.no}화`, summary: meta.summary.trim() || null }));
    setBusy(false);
    if (ok) setMode('view');
  };

  return (
    <Card tone="highlight" className={s.detail}>
      <div className={s.detailHead}>
        <h2>
          {episode.no}화 「{episode.title ?? `${episode.no}화`}」
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {copy.episodes.close}
        </Button>
      </div>

      {mode === 'edit' ? (
        <form className={s.form} onSubmit={submitMeta}>
          <TextField label={copy.episodes.titleLabel} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={80} autoFocus />
          <TextArea label={copy.episodes.summaryLabel} value={meta.summary} onChange={(e) => setMeta({ ...meta, summary: e.target.value })} rows={3} />
          <div className={s.formActions}>
            <Button variant="ghost" onClick={() => setMode('view')} disabled={busy}>
              {copy.episodes.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {copy.episodes.save}
            </Button>
          </div>
        </form>
      ) : (
        <p className={s.muted}>{episode.summary ?? copy.episodes.noSummary}</p>
      )}

      <div className={s.items}>
        <h3>{copy.episodes.itemsTitle}</h3>
        {canWrite && <p className={s.muted}>{copy.episodes.itemsHint}</p>}
        <div className={s.checks}>
          {data.items.map((i) => (
            <label key={i.id} className={present.has(i.id) ? `${s.check} ${s.checkOn}` : s.check}>
              <input type="checkbox" checked={present.has(i.id)} disabled={!canWrite} onChange={(e) => toggle(i, e.target.checked)} />
              {i.name} <KindTag kind={i.kind} />
            </label>
          ))}
        </div>
      </div>

      {chunkError && <ErrorState body={chunkError} />}
      {!chunks && !chunkError ? (
        <Loading label={copy.episodes.loadingBody} />
      ) : (
        <div className={s.body}>
          {scenes.map((text, idx) => (
            <section key={idx} className={s.scene} aria-label={copy.episodes.scene(idx + 1)}>
              <span className={s.sceneNo}>{copy.episodes.scene(idx + 1)}</span>
              {text.split('\n').map((para, pi) => (
                <p key={pi}>
                  {highlightPieces(para, data.items).map((piece, k) =>
                    piece.itemId ? (
                      <mark key={k} className={s.mark} title={data.itemById.get(piece.itemId)?.name}>
                        {piece.text}
                      </mark>
                    ) : (
                      piece.text
                    ),
                  )}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}

      {mode === 'confirmDelete' && (
        <ConfirmBar
          message={copy.episodes.removeConfirm(episode.no)}
          confirmLabel={copy.episodes.remove}
          cancelLabel={copy.episodes.cancel}
          busy={busy}
          onCancel={() => setMode('view')}
          onConfirm={async () => {
            setBusy(true);
            const ok = await save(
              workId,
              async () => {
                await deleteEpisode(episode.id);
                await recomputeCoOccur(workId);
              },
              copy.toast.deleted,
            );
            setBusy(false);
            if (ok) onClose();
          }}
        />
      )}
      {canWrite && mode === 'view' && (
        <div className={s.actions}>
          <Button variant="ghost" size="sm" onClick={() => { setMeta({ title: episode.title ?? '', summary: episode.summary ?? '' }); setMode('edit'); }}>
            {copy.episodes.editMeta}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await save(workId, () => reanalyzeEpisode(episode, data.items), copy.episodes.reanalyzed);
              setBusy(false);
            }}
          >
            {copy.episodes.reanalyze}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode('confirmDelete')}>
            {copy.episodes.remove}
          </Button>
        </div>
      )}
    </Card>
  );
}
