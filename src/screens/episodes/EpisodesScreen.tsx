import { useParams, useSearchParams } from 'react-router-dom';
import { ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { EpisodeListSection } from './sections/EpisodeListSection';
import { EpisodeDetailSection } from './sections/EpisodeDetailSection';

/** 회차 기록(BUILD_SPEC 6.9). 열어 본 회차는 주소의 ?open=회차번호 로 기억한다. */
export default function EpisodesScreen() {
  const { workId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const setOpen = (no: number | null) =>
    setParams((p) => {
      if (no == null) p.delete('open');
      else p.set('open', String(no));
      return p;
    });
  return (
    <ScreenLayout eyebrow={copy.episodes.eyebrow} title={copy.episodes.title}>
      <WorkDataGate workId={workId}>
        {() => (
          <>
            {open && <EpisodeDetailSection workId={workId} no={Number(open)} onClose={() => setOpen(null)} />}
            <EpisodeListSection workId={workId} openNo={open ? Number(open) : null} onOpen={setOpen} />
          </>
        )}
      </WorkDataGate>
    </ScreenLayout>
  );
}
