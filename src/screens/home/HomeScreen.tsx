import { useNavigate, useParams } from 'react-router-dom';
import { ArtImage } from '../../components/ArtImage';
import { art } from '../../config/art';
import { WriteButton } from '../../components/WriteButton';
import { Icon } from '../../components/Icon';
import { ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { useCanWrite, useWork } from '../../features/works/useWork';
import { ResolveProgressSection } from './sections/ResolveProgressSection';
import { RecentUploadsSection } from './sections/RecentUploadsSection';
import { SampleDemoSection } from './sections/SampleDemoSection';
import { MapCardSection } from './sections/MapCardSection';
import { CheckListSection } from './sections/CheckListSection';
import s from './sections/workroom.module.css';

/**
 * 작업실(BUILD_SPEC 6.3 · 2026-11-28 재디자인).
 * 위: 작품명 · 다음 회차 · [원고 불러오기]. 왼쪽 약 68%: 우주 지도 미리보기 + 최근 원고, 오른쪽 약 32%: 확인할 내용 + 복선 회수 현황.
 * 원고·항목이 없으면 첫 원고 불러오기 안내. 각 섹션은 workId만 받아 스스로 데이터를 가져온다.
 */
export default function HomeScreen() {
  const { workId = '' } = useParams();
  const nav = useNavigate();
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const upload = (
    <WriteButton workId={workId} onClick={() => nav(`/w/${workId}/upload`)} icon={<Icon name="upload" size={17} />}>
      {copy.home.upload}
    </WriteButton>
  );
  return (
    <WorkDataGate workId={workId}>
      {(data) => (
        <ScreenLayout
          tip="home"
          pageName={copy.home.roomName}
          title={
            <span className={s.titleRow}>
              <span className={s.workTitle}>{work?.title ?? copy.home.roomName}</span>
              <span className={s.next}>{copy.home.nextTitle(data.next)}</span>
            </span>
          }
          action={
            <>
              {/* 머리 버튼은 하나만: 내 작품은 [원고 불러오기], 예시 작품은 핵심 체험(꺼진 버튼을 나란히 두지 않는다) */}
              <SampleDemoSection workId={workId} />
              {canWrite && upload}
            </>
          }
        >
          {data.episodes.length === 0 && data.items.length === 0 ? (
            <div className={s.empty}>
              <ArtImage art={art.emptyManuscript} className={s.emptyArt} />
              <h2>{copy.home.emptyRoomTitle}</h2>
              <p className={s.muted}>{copy.home.emptyRoomBody}</p>
              {upload}
            </div>
          ) : (
            <div className={s.grid}>
              <div className={s.mainCol}>
                <MapCardSection workId={workId} />
                <RecentUploadsSection workId={workId} />
              </div>
              <aside className={s.sideCol}>
                <CheckListSection workId={workId} />
                <ResolveProgressSection workId={workId} />
              </aside>
            </div>
          )}
        </ScreenLayout>
      )}
    </WorkDataGate>
  );
}
