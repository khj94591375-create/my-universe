// 문체 분석. 입력 { workId }. 최근 회차(최대 10개)에서 고르게 뽑은 표본(8,000자)으로 특징 3~5개. 아무것도 저장하지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { keepTraits, sampleBodies } from '../_shared/style.ts';
import { styleSchema } from '../_shared/schemas.ts';
import { STYLE_SYSTEM } from '../_shared/prompts.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const { data, error } = await admin.from('episodes').select('no, body').eq('work_id', workId).order('no', { ascending: false }).limit(10);
  if (error) throw error;
  const bodies = ((data ?? []) as { no: number; body: string }[]).reverse().map((e) => e.body);
  const sample = sampleBodies(bodies);
  if ([...sample].length < 300) throw new HttpError('bad_request', '원고가 너무 짧아요.');
  const raw = await askJson({ tier: 'fast', system: STYLE_SYSTEM, user: `원고 표본:\n<<<\n${sample}\n>>>\n\n문체 특징을 JSON으로 답하라.`, schema: styleSchema });
  const { traits, dropped } = keepTraits(raw.traits, sample);
  await addUsage(admin, userId, 'text');
  return { traits, dropped, episodes: bodies.length, sampleChars: [...sample].length };
});
