// 회차 요약 초안. 입력 { workId, episodeId }. 원고·요약은 읽기만 하고 저장하지 않는다(작가가 고쳐서 저장).
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { summarySchema } from '../_shared/schemas.ts';
import { SUMMARY_SYSTEM } from '../_shared/prompts.ts';

const MAX_BODY = 30000;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const episodeId = str(ctx.body, 'episodeId');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');

  const { data: eps, error } = await admin.from('episodes').select('id, no, title, summary, body').eq('work_id', workId).order('no');
  if (error) throw error;
  const list = (eps ?? []) as { id: string; no: number; title: string | null; summary: string | null; body: string }[];
  const ep = list.find((e) => e.id === episodeId);
  if (!ep) throw new HttpError('not_found', '회차를 찾을 수 없어요.');
  if (!ep.body.trim()) throw new HttpError('bad_request', '원고가 비어 있어요.');

  const prev = list.filter((e) => e.no < ep.no && e.summary).slice(-3);
  const { data: items } = await admin.from('items').select('name').eq('work_id', workId).limit(150);
  const names = ((items ?? []) as { name: string }[]).map((i) => i.name);
  const body = [...ep.body].slice(0, MAX_BODY).join('');

  const out = await askJson({
    tier: 'fast',
    system: SUMMARY_SYSTEM,
    user: [
      `설정집 이름: ${names.length ? names.join(', ') : '없음'}`,
      prev.length ? `이전 회차 요약:\n${prev.map((e) => `${e.no}화: ${e.summary}`).join('\n')}` : '',
      `${ep.no}화 원고:\n<<<\n${body}\n>>>`,
      `${ep.no}화를 2~3문장으로 요약해 JSON으로 답하라.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    schema: summarySchema,
  });
  await addUsage(admin, userId, 'text');
  return { summary: out.summary.trim() };
});
