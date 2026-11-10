import { AiCallError, callAi, type AiErrorCode, type AnalyzeResult } from '../../data/ai';
import { aiErrorMessage, refreshAiStatus } from './aiStatus';

export type AiAnalyzeResult = { episodeId: string; no: number; ok: boolean; error?: string; code?: AiErrorCode; found: number; counts?: AnalyzeResult['counts'] };

/** 이 오류가 나면 나머지 회차도 실패하므로 멈춘다 */
const STOP: AiErrorCode[] = ['limit', 'ai_off', 'not_deployed', 'login', 'forbidden', 'sample'];

/**
 * 규칙 정리가 끝난 회차들을 AI로 정리한다(BUILD_SPEC 6.4, 8.4). 회차 순서대로, 실패해도 나머지는 계속.
 */
export async function aiAnalyzeEpisodes(
  workId: string,
  episodes: { id: string; no: number }[],
  onProgress: (done: number, total: number, no: number) => void,
  shouldStop: () => boolean = () => false,
): Promise<AiAnalyzeResult[]> {
  const sorted = [...episodes].sort((a, b) => a.no - b.no);
  const out: AiAnalyzeResult[] = [];
  for (const [i, ep] of sorted.entries()) {
    if (shouldStop()) break;
    onProgress(i, sorted.length, ep.no);
    try {
      const r = await callAi<AnalyzeResult>('analyze-episode', { workId, episodeId: ep.id });
      out.push({ episodeId: ep.id, no: ep.no, ok: true, found: r.counts.new_items + r.counts.aliases + r.counts.relations + r.counts.resolutions, counts: r.counts });
    } catch (e) {
      const code = e instanceof AiCallError ? e.code : undefined;
      out.push({ episodeId: ep.id, no: ep.no, ok: false, error: aiErrorMessage(e), code, found: 0 });
      if (code && STOP.includes(code)) break;
    }
  }
  onProgress(sorted.length, sorted.length, sorted.at(-1)?.no ?? 0);
  refreshAiStatus(); // 사용량 갱신
  return out;
}
