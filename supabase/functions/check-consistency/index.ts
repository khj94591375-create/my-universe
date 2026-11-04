// 설정 충돌 감지(BUILD_SPEC 7.9, 8.8). 입력 { workId, itemId? } — 없으면 캐릭터 전체(최대 20개).
// 두 근거 모두 원고에 글자 그대로 있을 때만 consistency_issues에 저장한다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot } from '../_shared/retrieval.ts';
import { buildConsistencyContext } from '../_shared/context.ts';
import { filterIssues } from '../_shared/rules.ts';
import { parseTag } from '../_shared/verify.ts';
import { consistencySchema } from '../_shared/schemas.ts';
import { CONSISTENCY_SYSTEM } from '../_shared/prompts.ts';

const MAX_ITEMS = 20;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const itemId = typeof ctx.body.itemId === 'string' ? ctx.body.itemId : null;
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const snap = await loadSnapshot(admin, workId);

  // 검사할 항목: 지정한 항목 하나, 아니면 많이 나온 캐릭터부터 20개
  const mentions = new Map<string, number>();
  for (const a of snap.appearances) mentions.set(a.item_id, (mentions.get(a.item_id) ?? 0) + 1);
  const targets = itemId
    ? snap.items.filter((i) => i.id === itemId)
    : snap.items.filter((i) => i.kind === 'character').sort((a, b) => (mentions.get(b.id) ?? 0) - (mentions.get(a.id) ?? 0)).slice(0, MAX_ITEMS);
  if (targets.length === 0) throw new HttpError('not_found', '검사할 항목이 없어요.');

  const ids = new Set(targets.map((t) => t.id));
  const chunkIds = [...new Set(snap.appearances.filter((a) => ids.has(a.item_id) && a.chunk_id).map((a) => a.chunk_id as string))];
  const epNo = new Map(snap.episodes.map((e) => [e.id, e.no]));
  const { data: chunks, error } = chunkIds.length
    ? await admin.from('chunks').select('id, episode_id, seq, text').in('id', chunkIds)
    : { data: [], error: null };
  if (error) throw error;
  const scenes = ((chunks ?? []) as { episode_id: string; seq: number; text: string }[]).map((c) => ({ ep: epNo.get(c.episode_id) ?? 0, seq: c.seq, text: c.text }));
  if (scenes.length === 0) return { checked: targets.length, saved: 0 };

  // look·note는 retrieval 스냅샷에 없어 따로 읽는다
  const { data: details } = await admin.from('items').select('id, look, note').in('id', [...ids]);
  const detail = new Map(((details ?? []) as { id: string; look: string | null; note: string | null }[]).map((d) => [d.id, d]));
  const context = buildConsistencyContext(
    targets.map((t) => ({ name: t.name, aliases: t.aliases, look: detail.get(t.id)?.look ?? null, note: detail.get(t.id)?.note ?? null })),
    scenes,
  );
  const raw = await askJson({ tier: 'fast', system: CONSISTENCY_SYSTEM, user: `${context.text}\n\n서로 모순되는 문장 쌍을 JSON으로 답하라.`, schema: consistencySchema });
  const byName = new Map(targets.map((t) => [t.name, t.id]));
  const issues = filterIssues(raw.issues, context.scenes, new Set(byName.keys()));

  // 이미 기록된(열림·무시·수정함) 같은 근거 쌍은 다시 넣지 않는다
  const { data: existing } = await admin.from('consistency_issues').select('item_id, evidence_a, evidence_b').eq('work_id', workId);
  const seen = new Set(((existing ?? []) as { item_id: string; evidence_a: string; evidence_b: string }[]).map((e) => [e.item_id, ...[e.evidence_a, e.evidence_b].sort()].join('|')));
  const rows = issues
    .map((i) => ({
      work_id: workId,
      item_id: byName.get(i.item_name),
      description: i.description.trim(),
      evidence_a: i.a.evidence,
      episode_a: parseTag(i.a.tag)?.ep ?? 0,
      evidence_b: i.b.evidence,
      episode_b: parseTag(i.b.tag)?.ep ?? 0,
    }))
    .filter((r) => !seen.has([r.item_id, ...[r.evidence_a, r.evidence_b].sort()].join('|')));
  if (rows.length) {
    const { error: e2 } = await admin.from('consistency_issues').insert(rows);
    if (e2) throw e2;
  }
  await addUsage(admin, userId, 'text');
  return { checked: targets.length, saved: rows.length, dropped: raw.issues.length - issues.length };
});
