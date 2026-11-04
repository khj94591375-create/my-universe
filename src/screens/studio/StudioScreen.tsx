import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Column, Columns, ScreenLayout } from '../../components/ScreenLayout';
import { copy } from '../../config/copy';
import { listWorkImages, type StoredImage } from '../../data/images';
import { toMessage } from '../../data/errors';
import { useCanWrite, useWork } from '../../features/works/useWork';
import { WorkDataGate } from '../shared/WorkDataGate';
import { StudioFormSection, type StudioPrefill } from './sections/StudioFormSection';
import { GallerySection } from './sections/GallerySection';
import s from './sections/studio.module.css';

/** 삽화 스튜디오(BUILD_SPEC 6.10). 왼쪽 만들기, 오른쪽 갤러리. */
export default function StudioScreen() {
  const { workId = '' } = useParams();
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const [images, setImages] = useState<StoredImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<StudioPrefill | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!canWrite) return setImages([]); // 그림은 소유자만 볼 수 있는 비공개 보관함에 있다
    listWorkImages(workId).then(setImages, (e) => setError(toMessage(e)));
  }, [workId, canWrite]);
  useEffect(reload, [reload]);

  return (
    <ScreenLayout eyebrow={copy.studio.eyebrow} title={copy.studio.title}>
      <WorkDataGate workId={workId}>
        {() => (
          <Columns ratio="1fr 1.2fr">
            <Column>
              <StudioFormSection
                workId={workId}
                prefill={prefill}
                onCreated={(img) => {
                  setFresh(img.id);
                  reload();
                }}
              />
            </Column>
            <Column>
              <GallerySection workId={workId} images={images} error={error} freshId={fresh} onChanged={reload} onRedraw={(p) => setPrefill({ ...p, nonce: Date.now() })} />
            </Column>
          </Columns>
        )}
      </WorkDataGate>
      <Card>
        <p className={s.copyright}>{copy.studio.copyright}</p>
      </Card>
    </ScreenLayout>
  );
}
