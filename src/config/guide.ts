/**
 * 처음 사용 가이드와 화면별 도움말 내용. [변경 가능]
 * 순서·문구·기호를 바꾸려면 이 파일만 고친다.
 */

export type TipId = 'home' | 'upload' | 'review' | 'forgot' | 'map' | 'bible' | 'episodes' | 'studio' | 'eval';

import type { FeatureArt } from './art';

/** art: 장마다 보여 줄 그림(src/config/art.ts). 'hero'는 시작 화면 큰 그림 */
export type TourStep = { art: FeatureArt | 'hero'; title: string; lines: string[] };

export const tourSteps: TourStep[] = [
  {
    art: 'hero',
    title: 'My Universe에 오신 걸 환영해요',
    lines: [
      '연재하면서 늘어나는 인물·설정·복선을 대신 기억해 드려요.',
      '오래 잊힌 복선을 다시 꺼내 다음 회차의 출발점을 찾아 드려요.',
      '1분이면 다 볼 수 있어요. 언제든 건너뛰어도 괜찮아요.',
    ],
  },
  {
    art: 'worldbuilding',
    title: '작품을 만들고 설정집에 이름을 넣어요',
    lines: [
      '작품 목록에서 "새 작품 만들기"를 눌러요.',
      '설정집에 주요 인물·장소·복선 이름과 다른 이름(별칭)을 넣어 두면, 원고에서 자동으로 찾아 기록해요.',
    ],
  },
  {
    art: 'writing',
    title: '원고를 올리면 자동으로 정리돼요',
    lines: [
      '워드·PDF·텍스트 파일을 여러 개 한 번에 올리거나, 본문을 붙여 넣어요. 한글(HWP) 파일은 PDF로 저장해서 올려요.',
      '"정리 결과 검토"에서 틀린 것만 고치면 돼요. AI가 찾은 것에는 "AI 추정" 표시가 붙어요.',
    ],
  },
  {
    art: 'foreshadowing',
    title: '막혔을 땐 "막혔어요!"를 눌러요',
    lines: [
      '홈에서 다음 회차 번호와 오래 잊힌 복선을 보여 줘요.',
      '"막혔어요! 하나 골라주세요"를 누르면 가장 오래 잊힌 항목을 골라 이어 쓸 방향과 원고 속 근거 문장을 보여 줘요.',
    ],
  },
  {
    art: 'storyGuide',
    title: '우주 지도에서 다음 회차를 설계해요',
    lines: [
      '항목은 별, 관계는 선이에요. 오래 잊힐수록 별이 희미해져요.',
      '별을 골라 다음 회차 장면을 설계해요. AI는 제안하고, 쓰는 건 언제나 작가예요.',
    ],
  },
];

/** 화면별 도움말 옆 작은 그림(그 메뉴의 기능 그림). 없으면 ? 표시 */
export const tipArt: Partial<Record<TipId, FeatureArt>> = {
  upload: 'writing',
  forgot: 'foreshadowing',
  map: 'storyGuide',
  bible: 'worldbuilding',
  studio: 'image',
};

export const screenTips: Record<TipId, string> = {
  home: '다음 회차 번호와 오래 잊힌 항목을 보여 줘요. 막히면 오른쪽 위 "막혔어요!"를 눌러 보세요.',
  upload: '설정집에 있는 이름·별칭을 원고에서 찾아요. 이름을 먼저 넣거나, 올린 뒤 회차 기록에서 "전체 다시 정리"를 누르세요.',
  review: '찾은 결과는 이미 반영됐어요. 틀린 줄만 지우거나 고치면 돼요. "AI 추정"은 맞는지 확인해 주세요.',
  forgot: '오래 잊힌 순서로 보여 줘요. 항목을 고르면 이어 쓸 방향과 원고 속 근거 문장이 나와요.',
  map: '별을 눌러 오른쪽에 담고, 정보창의 "연결 추가"로 관계를 이을 수 있어요. 휠로 확대, 끌어서 이동, Tab·Enter로도 고를 수 있어요.',
  bible: '이름·외모·별칭을 고치면 다음 원고부터 반영돼요. 외모를 적어 두면 삽화를 그릴 때 그대로 쓰여요.',
  episodes: '회차를 열면 장면별 원고와 나온 항목이 보여요. 체크로 등장 기록을 직접 넣고 뺄 수 있어요.',
  studio: '등장인물을 고르면 설정집의 외모가 요청 문장에 자동으로 들어가요. "보낼 요청 문장 미리보기"로 확인해 보세요.',
  eval: '미리 적어 둔 정답 설정집(CSV)과 비교해 얼마나 찾았는지 숫자로 보여 줘요. "예시 정답 받기"로 형식을 볼 수 있어요.',
};
