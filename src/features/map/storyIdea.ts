import { copy } from '../../config/copy';
import type { Appearance, Episode, ItemView, Link } from '../../data/types';
import { templateGuide } from '../foreshadow/guideTemplate';

/*
 * 우주 지도에서 고른 별로 만드는 기본 이야기 방향(AI 없이, BUILD_SPEC 7.8).
 * 이미 기록된 관계·등장·상태만 쓰고, 새 설정을 만들거나 저장하지 않는다.
 */

export type IdeaEvidence = { itemId: string; item: string; text: string; ep: number | null };
export type StoryIdea = { lines: string[]; evidence: IdeaEvidence[]; missing: string[] };

export function basicStoryIdea(
  chosen: ItemView[],
  links: Pick<Link, 'a' | 'b' | 'kind' | 'label' | 'weight'>[],
  appearances: Pick<Appearance, 'item_id' | 'episode_id' | 'evidence'>[],
  episodes: Pick<Episode, 'id' | 'no'>[],
): StoryIdea | null {
  if (chosen.length === 0) return null;
  const lines: string[] = [];
  const [a, b, ...rest] = chosen;
  if (!b) {
    const g = templateGuide(a.kind, a.name, a.last_ep);
    lines.push(`${g.directions[0].title}: ${g.directions[0].body}`);
  } else {
    const between = links.filter((l) => (l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id));
    const named = between.find((l) => l.kind !== 'co_occur' && l.label);
    const co = between.find((l) => l.kind === 'co_occur');
    if (named?.label) lines.push(copy.map.idea.withRelation(a.name, b.name, named.label));
    else if (co) lines.push(copy.map.idea.sharedScene(a.name, b.name, co.weight));
    else lines.push(copy.map.idea.pair(a.name, b.name));
  }
  for (const f of chosen.filter((i) => i.kind === 'foreshadow' && i.status === 'open')) lines.push(copy.map.idea.resolve(f.name, f.gap));
  if (rest.length) lines.push(copy.map.idea.others(rest.map((i) => i.name)));

  // 근거: 고른 별마다 가장 최근 회차의 원고 문장 하나
  const no = new Map(episodes.map((e) => [e.id, e.no]));
  const evidence: IdeaEvidence[] = [];
  const missing: string[] = [];
  for (const it of chosen) {
    const best = appearances
      .filter((x) => x.item_id === it.id && x.evidence)
      .map((x) => ({ text: x.evidence, ep: no.get(x.episode_id) ?? null }))
      .sort((x, y) => (y.ep ?? 0) - (x.ep ?? 0))[0];
    if (best) evidence.push({ itemId: it.id, item: it.name, ...best });
    else missing.push(it.name);
  }
  return { lines, evidence, missing };
}
