import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScreenLayout } from '../../components/ScreenLayout';
import { WriteButton } from '../../components/WriteButton';
import { Button } from '../../components/Button';
import s from './sections/bible.module.css';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { NewItemSection } from './sections/NewItemSection';
import { ItemListSection } from './sections/ItemListSection';
import { ConflictSection } from './sections/ConflictSection';
import { AskWorldSection } from './sections/AskWorldSection';

/** 설정집(BUILD_SPEC 6.8). 종류별 목록 + 화면 안에서 바로 고치기. */
export default function BibleScreen() {
  const { workId = '' } = useParams();
  const [adding, setAdding] = useState(false);
  // 세계관 질문하기: 이름 검색과 구분되는 버튼으로 연다
  const [asking, setAsking] = useState(false);
  return (
    <ScreenLayout
      tip="bible"
      pageName={copy.bible.pageName}
      title={copy.bible.title}
      action={
        <div className={s.actions}>
          <Button variant="ghost" aria-expanded={asking} aria-controls="ask-world" onClick={() => setAsking((v) => !v)}>
            {copy.bible.askOpen}
          </Button>
          {!adding && (
            <WriteButton workId={workId} onClick={() => setAdding(true)}>
              {copy.bible.add}
            </WriteButton>
          )}
        </div>
      }
    >
      <WorkDataGate workId={workId}>
        {() => (
          <>
            {adding && <NewItemSection workId={workId} onClose={() => setAdding(false)} />}
            {asking && (
              <div id="ask-world">
                <AskWorldSection workId={workId} />
              </div>
            )}
            <ItemListSection workId={workId} />
            <ConflictSection workId={workId} />
          </>
        )}
      </WorkDataGate>
    </ScreenLayout>
  );
}
