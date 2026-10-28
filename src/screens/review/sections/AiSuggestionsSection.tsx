import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { AiBadge, EvidenceQuote } from '../../../components/Badges';
import { copy } from '../../../config/copy';
import { confirmAiLink, confirmAlias, deleteLink, removeAlias } from '../../../data/items';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './review.module.css';

/** 회차와 상관없는 AI 추정: 별칭, 관계. 맞아요(확정) / 지우기. */
export function AiSuggestionsSection({ workId }: { workId: string }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  if (!data) return null;
  const aliases = data.items.flatMap((i) => i.aiAliases.map((alias) => ({ item: i, alias })));
  const links = data.links.filter((l) => l.kind === 'ai');
  if (aliases.length === 0 && links.length === 0) return null;
  const name = (id: string) => data.itemById.get(id)?.name ?? '';
  return (
    <>
      {aliases.length > 0 && (
        <Card title={copy.review.aiAliasesTitle}>
          <ul className={s.rows}>
            {aliases.map(({ item, alias }) => (
              <li key={`${item.id}|${alias}`} className={s.row}>
                <div className={s.rowHead}>
                  <strong>{copy.review.aliasRow(item.name, alias)}</strong>
                  <AiBadge />
                  {canWrite && (
                    <span className={s.actions}>
                      <Button size="sm" onClick={() => save(workId, () => confirmAlias(item.id, alias))}>
                        {copy.review.ok}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => save(workId, () => removeAlias(item.id, alias), copy.toast.deleted)}>
                        {copy.review.remove}
                      </Button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {links.length > 0 && (
        <Card title={copy.review.aiLinksTitle}>
          <ul className={s.rows}>
            {links.map((l) => (
              <li key={l.id} className={s.row}>
                <div className={s.rowHead}>
                  <strong>{copy.review.linkRow(name(l.a), name(l.b), l.label)}</strong>
                  <AiBadge evidence={l.evidence} />
                  {canWrite && (
                    <span className={s.actions}>
                      <Button size="sm" onClick={() => save(workId, () => confirmAiLink(l.id))}>
                        {copy.review.ok}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => save(workId, () => deleteLink(l.id), copy.toast.deleted)}>
                        {copy.review.remove}
                      </Button>
                    </span>
                  )}
                </div>
                {l.evidence && <EvidenceQuote text={l.evidence} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
