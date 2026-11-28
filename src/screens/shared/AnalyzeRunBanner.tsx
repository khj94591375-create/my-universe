import { Button } from '../../components/Button';
import { copy } from '../../config/copy';
import { clearAnalyzeRun, startAnalyze, useAnalyzeRun } from '../../features/ai/analyzeTracker';
import s from './AnalyzeRunBanner.module.css';

/**
 * AI 정리 진행 띠(검토 화면·회차 기록 위). 정리 중이면 몇 번째 회차인지, 끝나면 찾은 수,
 * 실패한 회차는 이유와 [AI 다시 정리]. 결과는 작품 데이터가 다시 불러와지면서 화면에 자동으로 나타난다.
 */
export function AnalyzeRunBanner({ workId }: { workId: string }) {
  const run = useAnalyzeRun(workId);
  if (!run) return null;
  if (run.running) {
    return (
      <div className={s.banner} role="status" aria-live="polite">
        <span className={s.spinner} aria-hidden="true" />
        <div>
          <p className={s.head}>{copy.ai.analyzing(run.done, run.total, run.no)}</p>
          <p className={s.sub}>{copy.ai.runningHint}</p>
        </div>
      </div>
    );
  }
  const failed = run.results.filter((r) => !r.ok);
  const found = run.results.reduce((n, r) => n + r.found, 0);
  const proposed = run.results.reduce((n, r) => n + (r.proposed ?? 0), 0);
  return (
    <div className={failed.length ? `${s.banner} ${s.warn}` : `${s.banner} ${s.ok}`} role={failed.length ? 'alert' : 'status'}>
      <div className={s.body}>
        <p className={s.head}>{run.mode === 'relations' ? copy.ai.relationsDone(found, proposed) : copy.ai.runDone(found)}</p>
        {failed.length > 0 && (
          <ul className={s.failed}>
            {failed.map((f) => (
              <li key={f.episodeId}>
                <span>
                  <strong>{f.no}화</strong> — {f.error}
                </span>
                <Button size="sm" variant="ghost" onClick={() => void startAnalyze(workId, [{ id: f.episodeId, no: f.no }], undefined, run.mode).catch(() => undefined)}>
                  {copy.ai.analyzeRetry}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={() => clearAnalyzeRun(workId)}>
        {copy.ai.runClose}
      </Button>
    </div>
  );
}
