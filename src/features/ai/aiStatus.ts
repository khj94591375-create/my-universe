import { useEffect, useSyncExternalStore } from 'react';
import { copy } from '../../config/copy';
import { AiCallError, callAi, type AiErrorCode, type AiStatus } from '../../data/ai';

/*
 * AI가 켜져 있는지 한 번 물어보고 기억한다. 꺼져 있으면 AI 버튼을 이유와 함께 끈다(BUILD_SPEC 0.3-6).
 */

type State = { phase: 'idle' | 'loading' | 'ready'; on: boolean; reason: string | null; status: AiStatus | null };
let state: State = { phase: 'idle', on: false, reason: null, status: null };
const subs = new Set<() => void>();
const set = (s: State) => {
  state = s;
  subs.forEach((f) => f());
};

export function aiErrorMessage(e: unknown): string {
  const code: AiErrorCode = e instanceof AiCallError ? e.code : 'ai_failed';
  switch (code) {
    case 'not_deployed':
      return copy.ai.notDeployed;
    case 'ai_off':
      return copy.ai.noKey;
    case 'limit':
      return copy.ai.limit;
    case 'sample':
      return copy.ai.sample;
    case 'login':
      return copy.ai.login;
    default:
      return copy.ai.failed;
  }
}

export function refreshAiStatus() {
  set({ ...state, phase: 'loading' });
  callAi<AiStatus>('ai-status').then(
    (st) => set({ phase: 'ready', on: st.enabled, reason: st.enabled ? null : copy.ai.noKey, status: st }),
    (e) => set({ phase: 'ready', on: false, reason: aiErrorMessage(e), status: null }),
  );
}

/** { on, reason, status }. 처음 쓸 때 한 번만 물어본다. */
export function useAiStatus() {
  const s = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
  useEffect(() => {
    if (state.phase === 'idle') refreshAiStatus();
  }, []);
  return s;
}
