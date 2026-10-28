// 설계 다듬기 대화(BUILD_SPEC 8.7). 입력 { sessionId, message }. 같은 세션의 대화와 선택 항목 근거를 다시 찾아 넣는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { retrieve } from '../_shared/retrieval.ts';
import { verifyEvidence } from '../_shared/verify.ts';
import { chatSchema } from '../_shared/schemas.ts';
import { CHAT_SYSTEM } from '../_shared/prompts.ts';

type Msg = { role: string; content: unknown; evidence?: unknown };

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const sessionId = str(ctx.body, 'sessionId');
  const message = str(ctx.body, 'message').slice(0, 2000);
  const { admin } = ctx;
  const { data: session } = await admin.from('design_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!session) throw new HttpError('not_found', '설계 기록을 찾을 수 없어요.');
  await requireOwnWork(admin, userId, session.work_id);
  await checkLimit(admin, userId, 'text');
  const context = await retrieve(admin, session.work_id, message, session.selected_item_ids ?? []);
  const history = ((session.messages ?? []) as Msg[])
    .slice(-12)
    .map((m) => `${m.role === 'user' ? '작가' : '보조'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n');
  const out = await askJson({
    tier: 'main',
    system: CHAT_SYSTEM,
    user: `${context.text}\n\n## 지금까지 대화\n${history}\n\n본문 초안 스위치: ${session.include_draft ? '켜짐' : '꺼짐'}\n작가: ${message}\n\nJSON으로 답하라.`,
    schema: chatSchema,
  });
  // 검증 안 된 근거는 "근거를 찾지 못함"(null)
  const evidence = out.evidence.map((e) => ({ text: verifyEvidence(e.text, e.tag, context.scenes) ? e.text : null, tag: e.tag }));
  const messages = [...((session.messages ?? []) as Msg[]), { role: 'user', content: message }, { role: 'assistant', content: out.reply, evidence }];
  await admin.from('design_sessions').update({ messages }).eq('id', sessionId);
  await addUsage(admin, userId, 'text');
  return { reply: out.reply, evidence };
});
