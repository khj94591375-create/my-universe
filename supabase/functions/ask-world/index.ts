// 세계관 질문하기. 입력 { workId, question }. 설정집·원고 장면을 찾아 근거와 함께 답한다. 아무것도 저장하지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { itemsInQuestion, keepVerified } from '../_shared/ask.ts';
import { askSchema } from '../_shared/schemas.ts';
import { ASK_SYSTEM } from '../_shared/prompts.ts';

const MAX_QUESTION = 500;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const question = str(ctx.body, 'question').trim();
  if (!question) throw new HttpError('bad_request', '질문을 적어 주세요.');
  if ([...question].length > MAX_QUESTION) throw new HttpError('bad_request', '질문이 너무 길어요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');

  const snap = await loadSnapshot(admin, workId);
  const ids = itemsInQuestion(question, snap.items);
  const context = await retrieve(admin, workId, question, ids, snap);
  const out = await askJson({
    tier: 'main',
    system: ASK_SYSTEM,
    user: `${context.text}\n\n작가의 질문: ${question}\n\nJSON으로 답하라.`,
    schema: askSchema,
  });
  const { evidence, dropped } = keepVerified(out.evidence, context.scenes);
  await addUsage(admin, userId, 'text');
  // found: AI가 답을 찾았다고 함 / evidence: 원고에 글자 그대로 있는 근거만(없으면 화면이 "원고 문장으로는 확인 못 함"을 표시)
  return { answer: out.answer.trim(), found: out.found, evidence, dropped, items: ids };
});
