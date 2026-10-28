import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { WorkDataGate } from '../shared/WorkDataGate';
import { PasteSection } from './sections/PasteSection';
import s from './sections/upload.module.css';

/** 원고 불러오기(BUILD_SPEC 6.4). M2: 붙여 넣기. 파일 올리기는 M3. */
export default function UploadScreen() {
  const { workId = '' } = useParams();
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  return (
    <ScreenLayout eyebrow={copy.upload.eyebrow} title={copy.upload.title}>
      <div className={s.tabs} role="tablist">
        {(['file', 'paste'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? `${s.tab} ${s.tabOn}` : s.tab} onClick={() => setTab(t)}>
            {t === 'file' ? copy.upload.tabFile : copy.upload.tabPaste}
          </button>
        ))}
      </div>
      {tab === 'file' ? (
        <EmptyState title={copy.upload.tabFile} body={`${copy.upload.fileLater} ${copy.upload.hwp}`} stage="M3" />
      ) : (
        <WorkDataGate workId={workId}>{() => <PasteSection workId={workId} />}</WorkDataGate>
      )}
      <p className={s.notice}>{copy.start.aiNotice}</p>
    </ScreenLayout>
  );
}
