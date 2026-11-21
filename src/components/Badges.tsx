import type { ReactNode } from 'react';
import { copy } from '../config/copy';
import type { ItemKind, ItemStatus } from '../data/types';
import { gapLabel } from '../features/foreshadow/gap';
import { Tag, type TagTone } from './Tag';
import { StarShape } from './StarShape';
import s from './Badges.module.css';

/** 미등장 회차 수 태그. gap으로 문구·색이 자동으로 정해진다(BUILD_SPEC 7.1). 오래 잊힌 경고만 알약 모양, 나머지는 글자만. */
export function GapTag({ gap }: { gap: number | null }) {
  if (gap == null) return null;
  const { text, tone } = gapLabel(gap);
  return (
    <Tag tone={tone} plain={tone !== 'warn'}>
      {text}
    </Tag>
  );
}

const statusTone: Record<ItemStatus, TagTone> = { open: 'neutral', resolved: 'ok', reuse_planned: 'info', reused: 'gold' };

/** 복선 상태 4단계(글자만). */
export function StatusTag({ status }: { status: ItemStatus }) {
  return <Tag tone={statusTone[status]} plain>{copy.labels.status[status]}</Tag>;
}

/** 종류: 우주 지도와 같은 별 모양 + 글자(알약 테두리 없이). */
export function KindTag({ kind }: { kind: ItemKind }) {
  return (
    <span className={`${s.kind} ${s[kind]}`}>
      <StarShape kind={kind} size={11} />
      {copy.labels.kind[kind]}
    </span>
  );
}

/** "AI 추정" 표시 + 설명(근거가 있으면 함께). */
export function AiBadge({ evidence }: { evidence?: string | null }) {
  return (
    <span className={s.ai} title={evidence ? `${copy.labels.aiTip}\n근거: ${evidence}` : copy.labels.aiTip}>
      <Tag tone="ai">{copy.labels.ai}</Tag>
    </span>
  );
}

/** 근거 문장 + 회차 표시. */
export function EvidenceQuote({ text, ep, children }: { text: string; ep?: number | null; children?: ReactNode }) {
  return (
    <blockquote className={s.quote}>
      <p>{text}</p>
      {(ep != null || children) && (
        <footer>
          {ep != null && copy.labels.evidenceAt(ep)}
          {children}
        </footer>
      )}
    </blockquote>
  );
}

/** 선택 칩(× 버튼). */
export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className={s.chip}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${String(children)} ${copy.labels.remove}`}>
          ×
        </button>
      )}
    </span>
  );
}
