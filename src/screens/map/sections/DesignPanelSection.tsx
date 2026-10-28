import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

/** 오른쪽 패널: 고른 별(칩), 이어 쓸 지점, 본문 초안 스위치(기본 꺼짐), 다음 회차 설계하기(M4에서 AI 연결). */
export function DesignPanelSection({ workId, selected, onRemove }: { workId: string; selected: string[]; onRemove: (id: string) => void }) {
  const { data } = useWorkData(workId);
  if (!data) return null;
  const last = data.episodes[data.episodes.length - 1];
  const chosen = selected.map((id) => data.itemById.get(id)).filter((i) => i != null);
  return (
    <Card className={s.panel}>
      <div className={s.panelBlock}>
        <h3>{copy.map.panel.selected}</h3>
        {chosen.length ? (
          <div className={s.chips}>
            {chosen.map((i) => (
              <Chip key={i.id} onRemove={() => onRemove(i.id)}>
                {i.name}
              </Chip>
            ))}
          </div>
        ) : (
          <p className={s.muted}>{copy.map.panel.selectedEmpty}</p>
        )}
      </div>
      <div className={s.panelBlock}>
        <h3>{copy.map.panel.continueFrom}</h3>
        <p>{last ? copy.map.panel.continueText(last.no, last.title ?? `${last.no}화`) : copy.map.panel.continueFirst}</p>
      </div>
      <label className={s.switch}>
        <input type="checkbox" role="switch" checked={false} disabled readOnly aria-describedby="draft-hint" />
        <span>{copy.map.panel.draftSwitch}</span>
      </label>
      <p id="draft-hint" className={s.muted}>
        {copy.map.panel.draftHint}
      </p>
      <Button variant="accent" block disabled title={copy.map.panel.aiOff}>
        {copy.map.panel.design}
      </Button>
      <p className={s.muted}>{copy.map.panel.aiOff}</p>
      <p className={s.chatNote}>{copy.map.panel.chat}</p>
    </Card>
  );
}
