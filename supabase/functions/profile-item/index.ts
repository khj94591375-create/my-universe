// 인물 소개 카드. 입력 { workId, itemId }. 원고 근거가 확인된 외모·성격·말투만 돌려준다. 아무것도 저장하지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { finishProfile } from '../_shared/profile.ts';
import { profileSchema } from '../_shared/schemas.ts';
import { PROFILE_SYSTEM } from '../_shared/prompts.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const itemId = str(ctx.body, 'itemId');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const snap = await loadSnapshot(admin, workId);
  const item = snap.items.find((i) => i.id === itemId);
  if (!item) throw new HttpError('not_found', '항목을 찾을 수 없어요.');
  const context = await retrieve(admin, workId, [item.name, ...item.aliases].join(' '), [itemId], snap);
  const raw = await askJson({
    tier: 'main',
    system: PROFILE_SYSTEM,
    user: `${context.text}\n\n정리할 인물: ${item.name}${item.aliases.length ? ` (별칭: ${item.aliases.join(', ')})` : ''}\n\nJSON으로 답하라.`,
    schema: profileSchema,
  });
  const out = finishProfile(raw, context.scenes);
  await addUsage(admin, userId, 'text');
  return out;
});
