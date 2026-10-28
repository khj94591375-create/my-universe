import { useNavigate } from 'react-router-dom';
import { WriteButton } from '../../../components/WriteButton';
import { copy } from '../../../config/copy';
import { Card } from '../../../components/Card';
import s from './sections.module.css';

/** 최근 원고 3개 + 새 원고 올리기. 데이터 연결은 M3. */
export function RecentUploadsSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  return (
    <Card title="최근 원고">
      <p className={s.placeholder}>아직 올린 원고가 없어요.</p>
      <WriteButton workId={workId} block onClick={() => nav(`/w/${workId}/upload`)} style={{ marginTop: 'var(--sp-2)' }}>
        {copy.home.newEpisode}
      </WriteButton>
    </Card>
  );
}
