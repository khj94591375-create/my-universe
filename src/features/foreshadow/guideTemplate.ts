import { josa } from './josa';

/*
 * 기본 가이드 템플릿(AI 꺼짐·실패 시, BUILD_SPEC 7.8). [변경 가능: 문장]
 * TODO(미정): 중간 프로토타입의 템플릿 문장이 저장소에 없어 반전·암시·캐릭터·설정 문장은 새로 썼다.
 */

export type GuideKind = 'character' | 'setting' | 'foreshadow';
export type GuideDirection = { title: string; body: string };
export type Guide = { opening: string; directions: GuideDirection[] };

export function templateGuide(kind: GuideKind, name: string, lastEp: number | null): Guide {
  const n = `「${name}」`;
  const opening = lastEp
    ? `“${name}”—그 이름을 다시 떠올린 건 ${lastEp}화 이후 처음이었다.`
    : `“${name}”—그 이름이 처음으로 이야기 속에 떠올랐다.`;
  const sets: Record<GuideKind, GuideDirection[]> = {
    foreshadow: [
      { title: '회수', body: `지금 장면의 문제를 푸는 결정적 단서로 ${josa(n, '을/를')} 다시 꺼내 보세요.` },
      { title: '반전', body: `모두가 알던 ${n}의 의미가 사실은 정반대였다는 것을 드러내 보세요.` },
      { title: '암시', body: `인물이 ${josa(n, '을/를')} 스치듯 떠올리게 해서, 곧 다시 중요해질 것임을 독자에게만 알려 주세요.` },
    ],
    character: [
      { title: '재등장', body: `${josa(n, '이/가')} 예상하지 못한 순간에 다시 나타나 장면의 흐름을 바꾸게 해 보세요.` },
      { title: '관계 변화', body: `주인공과 ${n} 사이에 작은 오해나 화해를 넣어 관계를 한 걸음 움직여 보세요.` },
      { title: '비밀', body: `${josa(n, '이/가')} 숨기고 있던 사실 하나를 조금만 드러내 보세요.` },
    ],
    setting: [
      { title: '규칙 활용', body: `${n}의 규칙을 이용해 주인공이 위기를 벗어나게 해 보세요.` },
      { title: '규칙 위기', body: `${n}의 규칙 때문에 주인공이 곤란해지는 상황을 만들어 보세요.` },
      { title: '대가', body: `${josa(n, '을/를')} 쓸 때 치러야 하는 대가를 처음으로 보여 주세요.` },
    ],
  };
  return { opening, directions: sets[kind] };
}
