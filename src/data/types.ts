/** DB 행 타입(BUILD_SPEC 5.1). 화면은 이 타입만 쓴다. */

export type Work = {
  id: string;
  owner_id: string | null;
  title: string;
  genre: string | null;
  is_sample: boolean;
  art_style: string | null;
  created_at: string;
};

/** 작품 목록 카드에 쓰는 계산 값(work_stats 뷰). */
export type WorkStats = {
  episode_count: number;
  open_foreshadow_count: number;
  last_upload_at: string | null;
};

export type WorkWithStats = Work & WorkStats;
