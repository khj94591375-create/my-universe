import { useState } from 'react';
import { WriteButton } from '../../../components/WriteButton';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { reanalyzeAll } from '../../../features/analysis/runRules';
import { save } from '../../../features/works/save';
import { useWorkData } from '../../../features/works/workData';

/** 모든 회차를 규칙으로 다시 정리한다(설정집에 항목을 새로 넣은 뒤). */
export function ReanalyzeAllButton({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const [label, setLabel] = useState<string | null>(null);
  if (!data || data.episodes.length === 0) return null;
  const run = async () => {
    await save(
      workId,
      () => reanalyzeAll(workId, data.episodes, data.items, (done, total) => setLabel(copy.episodes.reanalyzeProgress(done, total))),
      '',
    );
    showToast(copy.episodes.reanalyzeProgress(data.episodes.length, data.episodes.length));
    setLabel(null);
  };
  return (
    <WriteButton workId={workId} variant="ghost" onClick={run} disabled={label != null} title={copy.episodes.reanalyzeAllHint}>
      {label ?? copy.episodes.reanalyzeAll}
    </WriteButton>
  );
}
