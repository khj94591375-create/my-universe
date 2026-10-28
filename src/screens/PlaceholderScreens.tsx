import { ScreenLayout } from '../components/ScreenLayout';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { WriteButton } from '../components/WriteButton';
import { copy } from '../config/copy';
import { useParams } from 'react-router-dom';

/*
 * M0용 화면 뼈대. 각 화면은 해당 단계에서 screens/<이름>/ 폴더의 실제 화면으로 교체한다.
 * (BUILD_SPEC 6장, 13장)
 */

export function UploadScreen() {
  const { workId = '' } = useParams();
  return (
    <ScreenLayout eyebrow="원고 불러오기" title={copy.upload.title}>
      <EmptyState
        title="원고 파일을 올리거나 붙여 넣으세요"
        body={`${copy.upload.empty} ${copy.upload.hwp}`}
        // TODO(M3): 실제 업로드 연결. 지금은 예시 작품에서 쓰기가 막히는지만 보여 준다.
        action={<WriteButton workId={workId} disabled title={copy.common.comingSoon}>{copy.upload.action}</WriteButton>}
        stage="M3"
      />
    </ScreenLayout>
  );
}

export function ForgotScreen() {
  return (
    <ScreenLayout eyebrow="잊힌 복선 찾기" title={copy.forgot.title}>
      <EmptyState title="아직 잊힌 항목이 없어요" body={copy.forgot.empty} stage="M2" />
    </ScreenLayout>
  );
}

export function MapScreen() {
  return (
    <ScreenLayout eyebrow="우주 지도" title={copy.map.title}>
      <EmptyState title="별자리를 그릴 항목이 없어요" body={copy.map.empty} stage="M2" />
    </ScreenLayout>
  );
}

export function BibleScreen() {
  return (
    <ScreenLayout eyebrow="설정집" title={copy.bible.title}>
      <EmptyState title="설정집이 비어 있어요" body={copy.bible.empty} stage="M2" />
    </ScreenLayout>
  );
}

export function EpisodesScreen() {
  return (
    <ScreenLayout eyebrow="회차 기록" title={copy.episodes.title}>
      <EmptyState title="기록된 회차가 없어요" body={copy.episodes.empty} stage="M2" />
    </ScreenLayout>
  );
}

export function StudioScreen() {
  return (
    <ScreenLayout eyebrow="삽화 스튜디오" title={copy.studio.title}>
      <EmptyState title="아직 만든 이미지가 없어요" body={copy.studio.empty} stage="M6" />
      <Card>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-sub)' }}>{copy.studio.copyright}</p>
      </Card>
    </ScreenLayout>
  );
}
