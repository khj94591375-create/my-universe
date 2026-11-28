import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EvidenceQuote } from '../../components/Badges';
import { copy } from '../../config/copy';
import { contextAround, locateEvidence } from '../../features/analysis/locate';
import { useWorkData } from '../../features/works/workData';
import s from './EvidenceWithContext.module.css';

/** 빈 줄이 여러 개면 한 줄로(펼친 원문이 너무 길어지지 않게) */
const tight = (t: string) => t.replace(/\n\s*\n+/g, '\n');

/**
 * 근거 인용 + [앞뒤 원문 보기]. 회차 본문에서 근거 문장을 찾아 앞뒤 2문장(각 최대 300자)을 펼쳐 보여 준다.
 * ep를 모르면 모든 회차(최근 회차부터)에서 찾는다. 본문에서 찾지 못하면 버튼 없이 인용만.
 */
export function EvidenceWithContext({ workId, text, ep, hideEp, children }: { workId: string; text: string; ep?: number | null; hideEp?: boolean; children?: ReactNode }) {
  const { data } = useWorkData(workId);
  const [open, setOpen] = useState(false);
  const id = useId();
  const found = useMemo(() => {
    if (!data || !text) return null;
    const pool = ep != null ? data.episodes.filter((e) => e.no === ep) : [...data.episodes].sort((a, b) => b.no - a.no);
    for (const e of pool) {
      const at = locateEvidence(e.body, text);
      if (at) return { ep: e.no, ...contextAround(e.body, at.start, at.end) };
    }
    return null;
  }, [data, text, ep]);

  const shownEp = ep ?? found?.ep ?? null;
  return (
    <div className={s.wrap}>
      <EvidenceQuote text={text} ep={hideEp ? null : shownEp}>
        {children}
        {found && (
          <button type="button" className={s.toggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? copy.labels.contextHide : copy.labels.contextShow}
          </button>
        )}
      </EvidenceQuote>
      {found && open && (
        <div id={id} className={s.context} role="region" aria-label={copy.labels.contextLabel(found.ep)}>
          <p>
            {found.cutBefore && '… '}
            {tight(found.before)}
            <mark>{found.match}</mark>
            {tight(found.after)}
            {found.cutAfter && ' …'}
          </p>
          <Link to={`/w/${workId}/episodes?open=${found.ep}`}>{copy.labels.contextOpen(found.ep)}</Link>
        </div>
      )}
    </div>
  );
}
