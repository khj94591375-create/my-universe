// 막힌 장면 대안 전개. 입력 { workId, situation }. 설정집·원고를 근거로 방향이 다른 대안 3개. 아무것도 저장하지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { itemsInQuestion } from '../_shared/ask.ts';
import { finishAlternatives } from '../_shared/unstick.ts';
import { unstickSchema } from '../_shared/schemas.ts';
import { UNSTICK_SYSTEM } from '../_shared/prompts.ts';

const MAX_SITUATION = 1500;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const situation = str(ctx.body, 'situation').trim();
  if (!situation) throw new HttpError('bad_request', '막힌 장면을 적어 주세요.');
  if ([...situation].length > MAX_SITUATION) throw new HttpError('bad_request', '설명이 너무 길어요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');

  const snap = await loadSnapshot(admin, workId);
  const ids = itemsInQuestion(situation, snap.items);
  const context = await retrieve(admin, workId, situation, ids, snap);
  const out = await askJson({
    tier: 'main',
    system: UNSTICK_SYSTEM,
    user: `${context.text}\n\n작가가 막힌 장면:\n<<<\n${situation}\n>>>\n\n대안 3개를 JSON으로 답하라.`,
    schema: unstickSchema,
  });
  const options = finishAlternatives(out.options, context.scenes, new Set(snap.items.map((i) => i.name)));
  await addUsage(admin, userId, 'text');
  return { options };
});
