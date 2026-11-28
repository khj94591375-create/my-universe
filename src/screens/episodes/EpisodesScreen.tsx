import { useParams, useSearchParams } from 'react-router-dom';
import { ManuscriptTabs } from '../shared/ManuscriptTabs';
import { ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { AnalyzeRunBanner } from '../shared/AnalyzeRunBanner';
import { EpisodeListSection } from './sections/EpisodeListSection';
import { EpisodeDetailSection } from './sections/EpisodeDetailSection';
import { ReanalyzeAllButton } from './sections/ReanalyzeAllButton';
import { StyleSection } from './sections/StyleSection';
import { AiOrganizeSection } from './sections/AiOrganizeSection';
import s from './sections/episodes.module.css';

/** 회차 기록(BUILD_SPEC 6.9). 열어 본 회차는 주소의 ?open=회차번호 로 기억한다. */
export default function EpisodesScreen() {
  const { workId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const setOpen = (no: number | null) =>
    setParams((p) => {
      if (no == null) p.delete('open');
      else p.set('open', String(no));
      p.delete('check');
      return p;
    });
  return (
    <ScreenLayout tip="episodes" pageName={copy.episodes.pageName} title={copy.episodes.title} action={<ReanalyzeAllButton workId={workId} />} tabs={<ManuscriptTabs workId={workId} />}>
      <AnalyzeRunBanner workId={workId} />
      <WorkDataGate workId={workId}>
        {() => (
          <>
            {/* 왼쪽 회차 목록 · 오른쪽 원문(읽기 폭 약 720px). 휴대폰은 목록 → 회차 → [닫기]로 돌아오기 */}
            <div className={open ? `${s.split} ${s.splitOpen}` : s.split}>
              <div className={s.listCol}>
                <EpisodeListSection workId={workId} openNo={open ? Number(open) : null} onOpen={setOpen} />
              </div>
              <div className={s.readCol}>
                {open ? (
                  <EpisodeDetailSection key={open} workId={workId} no={Number(open)} onClose={() => setOpen(null)} autoCheck={params.get('check') === '1'} />
                ) : (
                  <p className={s.pickHint}>{copy.episodes.pickHint}</p>
                )}
                <AiOrganizeSection workId={workId} />
                <StyleSection workId={workId} />
              </div>
            </div>
          </>
        )}
      </WorkDataGate>
    </ScreenLayout>
  );
}
