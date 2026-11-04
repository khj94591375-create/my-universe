/*
 * 삽화 요청 문장(BUILD_SPEC 8.9). 화면의 미리보기와 서버가 같은 함수를 쓴다(외부 의존 없음).
 * [고정] 고른 항목의 look(외모·모습)을 항상 그대로 넣는다.
 */

export type ImagePurpose = 'sketch' | 'illustration' | 'cover' | 'sheet';
export type ImageRatio = '3:4' | '4:3' | '1:1';
export type PromptItem = { name: string; kind: 'character' | 'setting' | 'foreshadow'; look: string | null };

const PURPOSE: Record<ImagePurpose, string> = {
  sketch: '웹소설 장면 스케치(연필 느낌의 가벼운 밑그림)',
  illustration: '웹소설 출판용 삽화(완성도 높은 한 장면)',
  cover: '웹소설 표지 시안(위쪽에 제목을 넣을 빈 자리를 남긴다)',
  sheet: '캐릭터·장소 이미지 시트(정면 전신, 단순한 배경, 외모가 잘 보이게)',
};

/** 용도별 기본 비율(BUILD_SPEC 6.10): 표지 3:4, 삽화 4:3, 시트 1:1 */
export const DEFAULT_RATIO: Record<ImagePurpose, ImageRatio> = { sketch: '4:3', illustration: '4:3', cover: '3:4', sheet: '1:1' };

/** 이미지 모델이 받는 크기 중 비율이 가장 가까운 것 */
export const SIZE: Record<ImageRatio, '1024x1536' | '1536x1024' | '1024x1024'> = { '3:4': '1024x1536', '4:3': '1536x1024', '1:1': '1024x1024' };

export function buildImagePrompt(opts: { purpose: ImagePurpose; style: string; scene: string; items: PromptItem[]; hasReference: boolean }): string {
  const lines = [`[용도] ${PURPOSE[opts.purpose]}`];
  if (opts.style.trim()) lines.push(`[화풍] ${opts.style.trim()}`);
  if (opts.scene.trim()) lines.push(`[장면] ${opts.scene.trim()}`);
  const chars = opts.items.filter((i) => i.kind === 'character');
  const places = opts.items.filter((i) => i.kind !== 'character');
  if (chars.length) lines.push('[등장인물]', ...chars.map((i) => `- ${i.name}: ${i.look?.trim() || '(외모 정보 없음)'}`));
  if (places.length) lines.push('[장소·설정]', ...places.map((i) => `- ${i.name}: ${i.look?.trim() || '(모습 정보 없음)'}`));
  if (opts.hasReference) lines.push('[참조] 함께 보낸 이미지 시트의 인물·장소 모습을 그대로 따른다.');
  lines.push(opts.purpose === 'cover' ? '[주의] 그림 안에 글자를 넣지 않는다. 제목이 들어갈 자리만 비워 둔다.' : '[주의] 그림 안에 글자를 넣지 않는다.');
  return lines.join('\n');
}
