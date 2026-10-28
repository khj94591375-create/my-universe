import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScreenLayout } from '../../components/ScreenLayout';
import { WriteButton } from '../../components/WriteButton';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { NewItemSection } from './sections/NewItemSection';
import { ItemListSection } from './sections/ItemListSection';

/** 설정집(BUILD_SPEC 6.8). 종류별 목록 + 화면 안에서 바로 고치기. */
export default function BibleScreen() {
  const { workId = '' } = useParams();
  const [adding, setAdding] = useState(false);
  return (
    <ScreenLayout
      eyebrow={copy.bible.eyebrow}
      title={copy.bible.title}
      action={
        !adding && (
          <WriteButton workId={workId} onClick={() => setAdding(true)}>
            {copy.bible.add}
          </WriteButton>
        )
      }
    >
      <WorkDataGate workId={workId}>
        {() => (
          <>
            {adding && <NewItemSection workId={workId} onClose={() => setAdding(false)} />}
            <ItemListSection workId={workId} />
          </>
        )}
      </WorkDataGate>
    </ScreenLayout>
  );
}
