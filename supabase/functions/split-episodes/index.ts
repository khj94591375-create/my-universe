// AI 회차 나누기. 입력 { workId, text }(브라우저에서 정리한 원고 글자). 회차 시작 줄만 돌려준다. 아무것도 저장하지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { checkStarts, numberLines } from '../_shared/split.ts';
import { splitSchema } from '../_shared/schemas.ts';
import { SPLIT_SYSTEM } from '../_shared/prompts.ts';

const MAX_TEXT = 120_000;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const text = str(ctx.body, 'text');
  if (!text.trim()) throw new HttpError('bad_request', '원고가 비어 있어요.');
  if ([...text].length > MAX_TEXT) throw new HttpError('bad_request', '한 번에 나눌 수 있는 원고가 너무 길어요. 파일을 나눠서 올려 주세요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const { numbered, map } = numberLines(text);
  const out = await askJson({ tier: 'fast', system: SPLIT_SYSTEM, user: `원고(줄 ${map.length}개):\n<<<\n${numbered}\n>>>\n\n회차 시작 줄을 JSON으로 답하라.`, schema: splitSchema });
  const starts = checkStarts(out.episodes, map);
  await addUsage(admin, userId, 'text');
  return { starts };
});
