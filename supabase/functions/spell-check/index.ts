// 맞춤법 검사. 입력 { workId, text } — text는 화면이 나눠 보낸 문단 묶음(최대 4,000자).
// 원고·분석 데이터는 읽기만 하고 아무것도 저장하지 않는다. 결과는 작가가 고를 제안 목록.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { spellSchema } from '../_shared/schemas.ts';
import { SPELL_SYSTEM } from '../_shared/prompts.ts';
import { filterSpell } from '../_shared/spell.ts';

const MAX_TEXT = 4000;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const text = str(ctx.body, 'text');
  if ([...text].length > MAX_TEXT) throw new HttpError('bad_request', '한 번에 보낼 수 있는 글이 너무 길어요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');

  // 보호 단어: 설정집 이름·별칭 + 작품 사전(0005 SQL 전이면 사전은 빈 목록)
  const { data: items } = await admin.from('items').select('name, item_aliases(alias)').eq('work_id', workId);
  const { data: terms } = await admin.from('style_terms').select('term').eq('work_id', workId);
  const protectedTerms = [
    ...((items ?? []) as { name: string; item_aliases: { alias: string }[] | null }[]).flatMap((i) => [i.name, ...(i.item_aliases ?? []).map((a) => a.alias)]),
    ...((terms ?? []) as { term: string }[]).map((t) => t.term),
  ];
  const list = [...new Set(protectedTerms)].slice(0, 300);

  const raw = await askJson({
    tier: 'fast',
    system: SPELL_SYSTEM,
    user: `보호 단어(바꾸지 말 것): ${list.length ? list.join(', ') : '없음'}\n\n원고:\n<<<\n${text}\n>>>\n\n고칠 만한 부분을 JSON으로 답하라.`,
    schema: spellSchema,
  });
  const { kept, dropped } = filterSpell(text, raw.suggestions, list);
  await addUsage(admin, userId, 'text');
  return { suggestions: kept, dropped };
});
