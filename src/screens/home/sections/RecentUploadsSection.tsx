import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import s from './sections.module.css';

/** 최근 원고 3개 + 새 원고 올리기. 데이터 연결은 M3. */
export function RecentUploadsSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  return (
    <Card title="최근 원고">
      <p className={s.placeholder}>아직 올린 원고가 없어요.</p>
      <Button block onClick={() => nav(`/w/${workId}/upload`)} style={{ marginTop: 'var(--sp-2)' }}>
        새 회차 원고 올리기
      </Button>
    </Card>
  );
}
