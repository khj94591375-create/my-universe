import { copy } from '../../config/copy';
import type { DesignResult } from '../../data/ai';
import type { Appearance, Episode, ItemView, Link } from '../../data/types';
import { templateGuide } from '../foreshadow/guideTemplate';
import { basicStoryIdea } from './storyIdea';

/*
 * 예시 작품용 "설계 체험": AI 대신 규칙으로 장면 3개를 화면에서만 만든다.
 * 고른 별의 실제 설정·관계·원고 문장만 쓰고, 서버를 부르거나 저장하지 않는다.
 */
export function demoDesign(
  chosen: ItemView[],
  links: Pick<Link, 'a' | 'b' | 'kind' | 'label' | 'weight'>[],
  appearances: Pick<Appearance, 'item_id' | 'episode_id' | 'evidence'>[],
  episodes: Pick<Episode, 'id' | 'no'>[],
  targetEp: number,
): DesignResult | null {
  const idea = basicStoryIdea(chosen, links, appearances, episodes);
  if (!idea) return null;
  const ev = new Map(idea.evidence.map((e) => [e.itemId, e]));
  const use = (it: ItemView) => {
    const e = ev.get(it.id);
    return { item: it.name, evidence: e?.text ?? null, tag: e?.ep ? `E${e.ep}-S1` : '' };
  };
  const [a, b] = chosen;
  const ga = templateGuide(a.kind, a.name, a.last_ep);
  const second = b ? templateGuide(b.kind, b.name, b.last_ep) : null;
  const scenes = [
    { no: 1, text: copy.map.demo.scene1(ga.opening), uses: [use(a)] },
    { no: 2, text: idea.lines[0], uses: chosen.slice(0, 2).map(use) },
    {
      no: 3,
      text: copy.map.demo.scene3(second ? second.directions[0].title : ga.directions[1].title, second ? second.directions[0].body : ga.directions[1].body),
      uses: [use(b ?? a)],
    },
  ];
  return { sessionId: '', targetEp, scenes, draft: null, missing: [] };
}
