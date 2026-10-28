// 잊힌 복선 가이드(BUILD_SPEC 8.5). 입력 { workId, itemId }. 검증 안 된 근거는 null로 돌려준다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { markEvidence } from '../_shared/rules.ts';
import { guideSchema } from '../_shared/schemas.ts';
import { GUIDE_SYSTEM } from '../_shared/prompts.ts';

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
  const next = (snap.episodes.at(-1)?.no ?? 0) + 1;
  const context = await retrieve(admin, workId, [item.name, ...item.aliases, item.note ?? ''].join(' '), [itemId], snap);
  const kindWord = { character: '캐릭터', setting: '설정', foreshadow: '복선' }[item.kind];
  const out = await askJson({
    tier: 'main',
    system: GUIDE_SYSTEM,
    user: `${context.text}\n\n항목: 「${item.name}」(${kindWord}, 마지막 등장 ${item.last_ep ?? '-'}화). 다음은 ${next}화다. 이 항목을 다시 꺼낼 가이드를 JSON으로 답하라.`,
    schema: guideSchema,
  });
  await addUsage(admin, userId, 'text');
  return {
    opening_line: out.opening_line,
    directions: markEvidence(out.directions.slice(0, 3), context.scenes),
    reuse_reason: out.reuse_reason || null,
  };
});
