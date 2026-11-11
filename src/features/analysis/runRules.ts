import type { Episode, ItemView } from '../../data/types';
import {
  deleteEpisode,
  fetchChunkItems,
  fetchDetachedAiAppearances,
  setAppearanceChunk,
  fetchWorkChunks,
  replaceRuleAppearancesForItem,
  findEpisodeByNo,
  insertAppearances,
  insertEpisode,
  replaceChunks,
  replaceCoOccurLinks,
  updateEpisode,
} from '../../data/episodes';
import { setItemStatus } from '../../data/items';
import { toMessage } from '../../data/errors';
import { computeCoOccur } from './cooccur';
import { detectAppearances, findInText, type DetectItem } from './detect';
import { splitLong, splitScenes, splitSentences } from './split';
import { fetchChunks } from '../../data/workData';

/*
 * 규칙 정리(AI 없음): 장면 나누기 → 재등장 감지 → 재사용 예정 → 재사용됨 → 같은 장면 연결선.
 * BUILD_SPEC 6.4 처리 순서 2단계, 7.3·7.4·7.6.
 */

/** 지금 장면들이 본문과 순서대로 맞으면(본문이 바뀌지 않았으면) 그 장면 나누기를 그대로 쓴다 — AI·작가가 나눈 장면을 지킨다 */
export function reusableScenes(body: string, chunkTexts: string[]): string[] | null {
  if (chunkTexts.length === 0) return null;
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
  const b = norm(body);
  let at = 0;
  for (const t of chunkTexts) {
    const i = b.indexOf(norm(t), at);
    if (i < 0) return null;
    at = i + norm(t).length;
  }
  return chunkTexts;
}

/**
 * 회차 하나를 규칙으로 정리한다. 이미 있던 규칙 등장 기록은 새로 만든다.
 * 장면: scenes를 주면 그대로(AI·작가가 나눈 장면), 없으면 지금 장면이 본문과 맞을 때 그대로, 아니면 규칙으로 나눈다.
 */
export async function analyzeEpisodeByRules(episode: Episode, items: ItemView[], scenes?: string[]) {
  const texts = scenes ? scenes.flatMap(splitLong) : (reusableScenes(episode.body, (await fetchChunks(episode.id)).map((c) => c.text)) ?? splitScenes(episode.body));
  const chunks = await replaceChunks(episode, texts);
  const found = detectAppearances(chunks, items);
  await insertAppearances(found.map((f) => ({ item_id: f.itemId, episode_id: episode.id, chunk_id: f.chunkId, evidence: f.evidence, source: 'rule' })));
  // 장면을 다시 만들면 AI 등장 기록의 장면 칸이 비므로, 근거 문장이 든 새 장면에 다시 잇는다
  const flat = chunks.map((x) => ({ id: x.id, text: x.text.replace(/\s+/g, ' ') }));
  await Promise.all(
    (await fetchDetachedAiAppearances(episode.id)).map((a) => {
      const ev = a.evidence?.replace(/\s+/g, ' ').trim();
      const c = ev ? flat.find((x) => x.text.includes(ev)) : null;
      return c ? setAppearanceChunk(a.id, c.id).catch(() => undefined) : undefined; // 같은 장면에 규칙 기록이 이미 있으면 그대로 둔다
    }),
  );
  const seen = new Set(found.map((f) => f.itemId));
  await Promise.all(items.filter((i) => i.status === 'reuse_planned' && seen.has(i.id)).map((i) => setItemStatus(i.id, 'reused')));
  await updateEpisode(episode.id, { analyzed_at: new Date().toISOString() });
}

/** 작품마다 한 번에 하나씩: 계산이 겹치면(체크를 빠르게 여러 번 누름 등) 앞 계산이 끝난 뒤 다음 계산 */
const coOccurQueue = new Map<string, Promise<void>>();

/** 작품 전체의 같은 장면 연결선을 다시 계산한다. */
export function recomputeCoOccur(workId: string): Promise<void> {
  const run = async () => {
    const { total, map } = await fetchChunkItems(workId);
    await replaceCoOccurLinks(workId, computeCoOccur(map, total));
  };
  const next = (coOccurQueue.get(workId) ?? Promise.resolve()).catch(() => undefined).then(run);
  coOccurQueue.set(workId, next);
  return next;
}

export type PasteInput = { no: number; title: string; body: string; /** AI가 나눈 장면(없으면 규칙) */ scenes?: string[] };

/** 같은 번호의 회차가 이미 있는지. 있으면 화면에서 덮어쓰기/건너뛰기를 묻는다. */
export function episodeExists(workId: string, no: number) {
  return findEpisodeByNo(workId, no).then((e) => e != null);
}

/** 회차 하나를 저장하고 규칙 정리까지 한다(같은 장면 연결선은 따로). overwrite면 같은 번호 회차를 지우고 새로 만든다. */
export async function saveEpisode(workId: string, input: PasteInput, items: ItemView[], overwrite: boolean, sourceFile: string): Promise<Episode> {
  const old = await findEpisodeByNo(workId, input.no);
  if (old) {
    if (!overwrite) throw new Error('같은 번호의 회차가 이미 있어요.');
    await deleteEpisode(old.id);
  }
  const episode = await insertEpisode(workId, {
    no: input.no,
    title: input.title.trim() || `${input.no}화`,
    body: input.body.replace(/\r\n?/g, '\n').trim(),
    source_file: sourceFile,
  });
  await analyzeEpisodeByRules(episode, items, input.scenes);
  return episode;
}

/** 붙여 넣은 회차를 저장하고 규칙 정리까지 한다. */
export async function savePastedEpisode(workId: string, input: PasteInput, items: ItemView[], overwrite: boolean): Promise<Episode> {
  const episode = await saveEpisode(workId, input, items, overwrite, '붙여 넣기');
  await recomputeCoOccur(workId);
  return episode;
}

export type BatchRow = PasteInput & { key: string; sourceFile: string };
export type BatchResult = { key: string; no: number; ok: boolean; error?: string; episodeId?: string };

/**
 * 여러 회차를 회차 번호 순서대로 저장·정리한다. 한 회차가 실패해도 나머지는 계속한다(BUILD_SPEC 6.4).
 * onProgress(끝낸 수, 전체 수, 지금 회차 번호). 같은 장면 연결선은 마지막에 한 번 계산한다.
 */
export async function saveEpisodes(
  workId: string,
  rows: BatchRow[],
  items: ItemView[],
  overwrite: boolean,
  onProgress: (done: number, total: number, no: number) => void,
): Promise<BatchResult[]> {
  const sorted = [...rows].sort((x, y) => x.no - y.no);
  const results: BatchResult[] = [];
  for (const [i, row] of sorted.entries()) {
    onProgress(i, sorted.length, row.no);
    try {
      const ep = await saveEpisode(workId, row, items, overwrite, row.sourceFile);
      results.push({ key: row.key, no: row.no, ok: true, episodeId: ep.id });
    } catch (e) {
      results.push({ key: row.key, no: row.no, ok: false, error: toMessage(e) });
    }
    // 화면이 멈추지 않도록 회차 사이에 한 번 쉰다
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress(sorted.length, sorted.length, sorted[sorted.length - 1]?.no ?? 0);
  if (results.some((r) => r.ok)) await recomputeCoOccur(workId);
  return results;
}

/** 작품의 모든 회차를 규칙으로 다시 정리(설정집에 항목을 새로 넣은 뒤 쓴다). */
export async function reanalyzeAll(workId: string, episodes: Episode[], items: ItemView[], onProgress: (done: number, total: number) => void) {
  for (const [i, ep] of episodes.entries()) {
    onProgress(i, episodes.length);
    await analyzeEpisodeByRules(ep, items);
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress(episodes.length, episodes.length);
  await recomputeCoOccur(workId);
}

/**
 * 설정집에서 항목을 넣거나 이름·별칭을 고친 뒤: 이미 올린 원고의 장면에서 그 항목만 다시 찾는다.
 * 장면은 다시 나누지 않고(빠름), 그 항목의 규칙 등장 기록만 바꾼다. 찾은 회차 수를 돌려준다.
 */
export async function researchItem(workId: string, item: DetectItem): Promise<number> {
  const chunks = await fetchWorkChunks(workId);
  if (chunks.length === 0) return 0;
  const epOf = new Map(chunks.map((c) => [c.id, c.episode_id]));
  const found = detectAppearances(chunks, [item]);
  await replaceRuleAppearancesForItem(
    item.id,
    found.map((f) => ({ item_id: item.id, episode_id: epOf.get(f.chunkId)!, chunk_id: f.chunkId, evidence: f.evidence })),
  );
  await recomputeCoOccur(workId);
  return new Set(found.map((f) => epOf.get(f.chunkId))).size;
}

/** 작가가 장면을 합치거나 나눈 뒤: 그 장면대로 다시 만들고 등장 기록·같은 장면 연결선을 다시 정리한다(AI 근거는 새 장면에 다시 연결). */
export async function resceneEpisode(episode: Episode, items: ItemView[], scenes: string[]) {
  await analyzeEpisodeByRules(episode, items, scenes);
  await recomputeCoOccur(episode.work_id);
}

/** 회차 다시 정리(규칙). */
export async function reanalyzeEpisode(episode: Episode, items: ItemView[]) {
  await analyzeEpisodeByRules(episode, items);
  await recomputeCoOccur(episode.work_id);
}

/** 작가가 회차에 등장 항목을 직접 체크: 근거 문장은 이름이 나온 문장, 없으면 첫 문장. */
export async function addManualAppearance(episode: Episode, item: ItemView) {
  const evidence = findInText(episode.body, item) ?? splitSentences(episode.body)[0]?.slice(0, 120) ?? episode.body.slice(0, 120);
  await insertAppearances([{ item_id: item.id, episode_id: episode.id, chunk_id: null, evidence, source: 'manual' }]);
}
