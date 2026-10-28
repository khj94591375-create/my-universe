// 다음 회차 설계(BUILD_SPEC 8.6). 입력 { workId, itemIds, targetEp, includeDraft }.
// [고정] includeDraft가 false면 서버에서 draft를 지운다. 결과는 design_sessions에 저장한다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { finishDesign } from '../_shared/rules.ts';
import { designSchema } from '../_shared/schemas.ts';
import { DESIGN_SYSTEM } from '../_shared/prompts.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const itemIds = Array.isArray(ctx.body.itemIds) ? (ctx.body.itemIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const includeDraft = ctx.body.includeDraft === true;
  if (itemIds.length === 0) throw new HttpError('bad_request', '항목을 하나 이상 골라 주세요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const snap = await loadSnapshot(admin, workId);
  const chosen = snap.items.filter((i) => itemIds.includes(i.id));
  if (chosen.length === 0) throw new HttpError('not_found', '고른 항목을 찾을 수 없어요.');
  const targetEp = Number(ctx.body.targetEp) || (snap.episodes.at(-1)?.no ?? 0) + 1;
  const context = await retrieve(admin, workId, chosen.map((i) => i.name).join(' '), itemIds, snap);
  const out = await askJson({
    tier: 'main',
    system: DESIGN_SYSTEM,
    user: `${context.text}\n\n${targetEp}화를 설계한다. 고른 항목: ${chosen.map((i) => `「${i.name}」`).join(', ')}.\n본문 초안 요청: ${includeDraft ? '있음(300자 이내)' : '없음(draft는 빈 문자열)'}\n장면 3개를 JSON으로 답하라.`,
    schema: designSchema,
  });
  const result = finishDesign({ ...out, scenes: out.scenes.slice(0, 3) }, includeDraft, context.scenes);
  const missing = chosen.filter((i) => !result.scenes.some((s) => s.uses.some((u) => u.item === i.name))).map((i) => i.name);
  const { data: session, error } = await admin
    .from('design_sessions')
    .insert({ work_id: workId, target_ep: targetEp, selected_item_ids: itemIds, include_draft: includeDraft, messages: [{ role: 'design', content: result }] })
    .select('id')
    .single();
  if (error) throw error;
  await addUsage(admin, userId, 'text');
  return { sessionId: session.id, targetEp, ...result, missing };
});
