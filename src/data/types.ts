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

export type ItemKind = 'character' | 'setting' | 'foreshadow';
export type ItemStatus = 'open' | 'resolved' | 'reuse_planned' | 'reused';
export type Source = 'manual' | 'rule' | 'ai';

export type Item = {
  id: string;
  work_id: string;
  kind: ItemKind;
  name: string;
  note: string | null;
  look: string | null;
  status: ItemStatus;
  source: Source;
  confirmed: boolean;
  reference_image_path: string | null;
  created_at: string;
};

export type Episode = {
  id: string;
  work_id: string;
  no: number;
  title: string | null;
  summary: string | null;
  body: string;
  source_file: string | null;
  analyzed_at: string | null;
  created_at: string;
};

export type Chunk = { id: string; episode_id: string; work_id: string; seq: number; text: string };

export type Appearance = {
  id: string;
  item_id: string;
  episode_id: string;
  chunk_id: string | null;
  evidence: string;
  source: 'rule' | 'ai' | 'manual';
  role: 'mention' | 'plant' | 'resolve';
};

export type LinkKind = 'co_occur' | 'ai' | 'manual';
/** forward = a → b, backward = b → a, none = 방향 없음. 0002 SQL 전에는 없을 수 있다. */
export type LinkDirection = 'none' | 'forward' | 'backward';
export type Link = {
  id: string;
  work_id: string;
  a: string;
  b: string;
  kind: LinkKind;
  label: string | null;
  weight: number;
  evidence: string | null;
  direction?: LinkDirection;
};

/** 화면에서 쓰는 항목: 별칭과 계산 값(처음·마지막 등장, gap)을 붙인 것. */
export type ItemView = Item & {
  aliases: string[];
  /** AI가 찾아 아직 확정하지 않은 별칭(aliases에도 들어 있다) */
  aiAliases: string[];
  first_ep: number | null;
  last_ep: number | null;
  mention_count: number;
  gap: number | null;
};
