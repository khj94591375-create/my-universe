/** 화면에서 쓰는 기준값. [변경 가능] */
export const limits = {
  /** 우주 지도에 기본으로 보이는 같은 장면 연결선의 최소 횟수(BUILD_SPEC 7.4) */
  mapCoOccurMin: 2,
  /** 이보다 많은 장면에 나오는 항목(주인공 등)은 같은 장면 연결선 계산에서 뺀다 */
  coOccurHubRatio: 0.6,
  /** 이 개수 이하면 방사형, 넘으면 force 배치(BUILD_SPEC 6.7) */
  mapRadialMax: 30,
  /** 장면이 이보다 길면 문단 경계에서 나눈다(BUILD_SPEC 7.6) */
  sceneMax: 1500,
  sceneTarget: 1000,
  /** 근거 문장 최대 길이 */
  evidenceMax: 120,
  /** 홈의 오래 잊힌 항목 개수 */
  homeForgottenCount: 4,
  /** 우주 지도 별 최소 밝기(BUILD_SPEC 6.7) */
  starMinOpacity: 0.35,
} as const;
