import { describe, expect, it } from 'vitest';
import type { ItemView } from '../../data/types';
import { aiResolveEps, FORGOTTEN_GAP, shapePath, starState } from '../map/stars';
import { basicStoryIdea } from '../map/storyIdea';

const item = (over: Partial<ItemView>): ItemView => ({
  id: 'x',
  work_id: 'w',
  kind: 'foreshadow',
  name: '은열쇠',
  note: null,
  look: null,
  status: 'open',
  source: 'manual',
  confirmed: true,
  reference_image_path: null,
  created_at: '',
  aliases: [],
  aiAliases: [],
  first_ep: 1,
  last_ep: 1,
  mention_count: 1,
  gap: 1,
  ...over,
});

describe('별 모양·상태', () => {
  it('종류마다 다른 모양을 그린다', () => {
    const paths = new Set((['character', 'setting', 'foreshadow'] as const).map((k) => shapePath(k, 10)));
    expect(paths.size).toBe(3);
  });
  it('오래 안 나온 미회수 항목은 잊힌 별, 밝기는 낮아진다', () => {
    const st = starState(item({ gap: FORGOTTEN_GAP + 1 }), 10);
    expect(st.forgotten).toBe(true);
    expect(st.brightness).toBeLessThan(1);
  });
  it('작가가 회수 완료로 정한 복선은 다시 밝고 잊힌 별이 아니다', () => {
    const st = starState(item({ gap: 9, status: 'resolved' }), 10);
    expect(st.done).toBe(true);
    expect(st.forgotten).toBe(false);
    expect(st.brightness).toBe(1);
  });
  it('AI 회수 추정은 미회수일 때만 "확인 전"으로 붙고, 상태를 바꾸지 않는다', () => {
    expect(starState(item({}), 5, 3).aiResolveEp).toBe(3);
    expect(starState(item({ status: 'resolved' }), 5, 3).aiResolveEp).toBeNull();
    expect(starState(item({}), 5, 3).done).toBe(false);
  });
  it('AI 회수 추정 회차는 AI가 찾은 resolve 기록만 센다', () => {
    const m = aiResolveEps(
      [
        { item_id: 'x', episode_id: 'e2', role: 'resolve', source: 'ai' },
        { item_id: 'x', episode_id: 'e3', role: 'resolve', source: 'rule' },
        { item_id: 'y', episode_id: 'e3', role: 'mention', source: 'ai' },
      ],
      [
        { id: 'e2', no: 2 },
        { id: 'e3', no: 3 },
      ],
    );
    expect(m.get('x')).toBe(2);
    expect(m.has('y')).toBe(false);
  });
});

describe('기본 이야기 방향', () => {
  const a = item({ id: 'a', kind: 'character', name: '리안' });
  const b = item({ id: 'b', name: '은열쇠', gap: 4 });
  it('기록된 관계 이름이 있으면 그 관계로 제안한다', () => {
    const idea = basicStoryIdea([a, b], [{ a: 'a', b: 'b', kind: 'manual', label: '열쇠의 주인', weight: 1 }], [], []);
    expect(idea?.lines[0]).toContain('열쇠의 주인');
  });
  it('관계가 없으면 이어져 있다고 말하지 않는다', () => {
    const idea = basicStoryIdea([a, b], [], [], []);
    expect(idea?.lines[0]).toContain('아직 이어진 적 없는');
  });
  it('미회수 복선에는 회수 제안, 근거는 실제 원고 문장(최근 회차)만', () => {
    const idea = basicStoryIdea(
      [a, b],
      [],
      [
        { item_id: 'b', episode_id: 'e1', evidence: '반쪽짜리 은열쇠였다.' },
        { item_id: 'b', episode_id: 'e2', evidence: '은열쇠가 떨렸다.' },
      ],
      [
        { id: 'e1', no: 1 },
        { id: 'e2', no: 2 },
      ],
    );
    expect(idea?.lines.some((l) => l.includes('미회수 복선'))).toBe(true);
    expect(idea?.evidence).toEqual([{ itemId: 'b', item: '은열쇠', text: '은열쇠가 떨렸다.', ep: 2 }]);
    expect(idea?.missing).toEqual(['리안']);
  });
  it('고른 별이 없으면 제안하지 않는다', () => {
    expect(basicStoryIdea([], [], [], [])).toBeNull();
  });
});

describe('설계 체험(예시 작품)', () => {
  it('장면 3개, 근거는 실제 원고 문장만, 저장할 것 없음', async () => {
    const { demoDesign } = await import('../map/demoDesign');
    const a = item({ id: 'a', kind: 'character', name: '리안', last_ep: 2 });
    const r = demoDesign([a], [], [{ item_id: 'a', episode_id: 'e2', evidence: '리안이 웃었다.' }], [{ id: 'e2', no: 2 }], 3);
    expect(r?.scenes).toHaveLength(3);
    expect(r?.targetEp).toBe(3);
    const evid = r!.scenes.flatMap((sc) => sc.uses.map((u) => u.evidence)).filter(Boolean);
    expect(evid.every((t) => t === '리안이 웃었다.')).toBe(true);
    expect(r?.draft).toBeNull();
  });
});
