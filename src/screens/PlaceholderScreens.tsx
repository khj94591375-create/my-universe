import { ScreenLayout } from '../components/ScreenLayout';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { copy } from '../config/copy';

/*
 * 아직 만들지 않은 화면의 뼈대. 해당 단계에서 screens/<이름>/ 폴더의 실제 화면으로 교체한다.
 * (BUILD_SPEC 6장, 13장)
 */

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
