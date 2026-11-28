import { useSyncExternalStore } from 'react';
import { refreshWorkData } from '../works/workData';
import { aiAnalyzeEpisodes, type AiAnalyzeResult } from './analyze';

/*
 * AI 정리 진행 상태(작품별). 화면 컴포넌트가 아니라 이 모듈이 기억하므로,
 * 저장 직후 검토 화면으로 옮겨 가도·다른 메뉴로 가도 "AI 정리 중"과 결과가 이어진다.
 * 한 회차가 끝날 때마다 작품 데이터를 다시 불러와 어느 화면이든 결과가 자동으로 나타난다.
 */
export type AnalyzeRun = {
  running: boolean;
  /** 지금까지 끝난 회차 수 / 전체 */
  done: number;
  total: number;
  /** 지금 정리 중인 회차 번호 */
  no: number;
  /** 이번에 정리하는(한) 회차 번호들 */
  nos: number[];
  /** 끝난 회차 결과(성공·실패) */
  results: AiAnalyzeResult[];
  /** 'relations' = 우주 지도의 "AI로 관계 찾기"(다시 시도도 같은 방식으로) */
  mode?: 'relations';
};

const runs = new Map<string, AnalyzeRun>();
const chains = new Map<string, Promise<unknown>>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const put = (workId: string, run: AnalyzeRun) => {
  runs.set(workId, run);
  emit();
};

/**
 * 회차들을 AI로 정리한다(같은 작품에서 이미 돌고 있으면 그다음에). 기다리지 않아도 된다.
 * shouldStop: 멈추기 버튼용.
 */
export function startAnalyze(workId: string, episodes: { id: string; no: number }[], shouldStop?: () => boolean, mode?: 'relations'): Promise<AiAnalyzeResult[]> {
  const nos = [...episodes].sort((a, b) => a.no - b.no).map((e) => e.no);
  const prev = chains.get(workId) ?? Promise.resolve();
  const job = prev.then(async () => {
    put(workId, { running: true, done: 0, total: nos.length, no: nos[0] ?? 0, nos, results: [], mode });
    const results: AiAnalyzeResult[] = [];
    const out = await aiAnalyzeEpisodes(
      workId,
      episodes,
      (done, total, no) => {
        put(workId, { running: done < total, done, total, no, nos, results: [...results], mode });
        if (done > 0) refreshWorkData(workId); // 한 회차가 끝날 때마다 결과를 보이게
      },
      shouldStop,
      mode,
    );
    results.push(...out);
    put(workId, { running: false, done: nos.length, total: nos.length, no: nos.at(-1) ?? 0, nos, results: out, mode });
    refreshWorkData(workId);
    return out;
  });
  const safe = job.catch(() => []);
  chains.set(workId, safe);
  return job;
}

/** 이 작품의 AI 정리 상태(없으면 undefined) */
export function useAnalyzeRun(workId: string): AnalyzeRun | undefined {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => runs.get(workId),
  );
}

/** 결과 안내를 닫는다 */
export function clearAnalyzeRun(workId: string) {
  if (runs.get(workId)?.running) return;
  runs.delete(workId);
  emit();
}
