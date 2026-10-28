// 회차 자동 정리(BUILD_SPEC 8.4). 입력 { workId, episodeId }.
// 결과는 바로 반영하되 AI 추정(source='ai', confirmed=false)으로 저장하고, 회수 추정은 제안만 저장한다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot } from '../_shared/retrieval.ts';
import { buildContext, trimItems } from '../_shared/context.ts';
import { filterAnalysis } from '../_shared/rules.ts';
import { parseTag } from '../_shared/verify.ts';
import { analysisSchema } from '../_shared/schemas.ts';
import { ANALYZE_SYSTEM } from '../_shared/prompts.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const episodeId = str(ctx.body, 'episodeId');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');

  const snap = await loadSnapshot(admin, workId);
  const ep = snap.episodes.find((e) => e.id === episodeId);
  if (!ep) throw new HttpError('not_found', '회차를 찾을 수 없어요.');
  const { data: chunkRows, error } = await admin.from('chunks').select('id, seq, text').eq('episode_id', episodeId).order('seq');
  if (error) throw error;
  const chunks = (chunkRows ?? []) as { id: string; seq: number; text: string }[];
  if (chunks.length === 0) throw new HttpError('bad_request', '장면이 없어요. 먼저 규칙 정리를 해 주세요.');

  const prev = snap.episodes.filter((e) => e.no < ep.no).slice(-3);
  const context = buildContext(trimItems(snap.items, new Set(), new Set()), prev, chunks.map((c) => ({ ep: ep.no, seq: c.seq, text: c.text })));
  const raw = await askJson({ tier: 'fast', system: ANALYZE_SYSTEM, user: `${context.text}\n\n위 ${ep.no}화를 정리해 JSON으로 답하라.`, schema: analysisSchema });

  const byName = new Map(snap.items.map((i) => [i.name, i.id]));
  const out = filterAnalysis(raw, context.scenes, new Set(byName.keys()));
  const chunkOf = (tag: string) => {
    const t = parseTag(tag);
    return chunks.find((c) => t && c.seq === t.seq)?.id ?? null;
  };

  // 회차 요약
  await admin.from('episodes').update({ summary: out.summary || null }).eq('id', episodeId);

  // 새 항목 + 등장(AI 추정)
  for (const it of out.new_items) {
    const { data: row, error: e1 } = await admin
      .from('items')
      .insert({ work_id: workId, kind: it.kind, name: it.name.trim(), note: it.note || null, look: it.look || null, source: 'ai', confirmed: false })
      .select('id')
      .single();
    if (e1 || !row) continue; // 같은 이름이 동시에 생긴 경우 등은 건너뛴다
    byName.set(it.name.trim(), row.id);
    await admin.from('appearances').insert({
      item_id: row.id,
      episode_id: episodeId,
      chunk_id: chunkOf(it.tag),
      evidence: it.evidence,
      source: 'ai',
      role: it.kind === 'foreshadow' ? 'plant' : 'mention',
    });
  }
  // 별칭(AI 추정)
  if (out.aliases.length) {
    await admin
      .from('item_aliases')
      .upsert(out.aliases.map((a) => ({ item_id: byName.get(a.item_name), alias: a.alias.trim(), source: 'ai' })), { ignoreDuplicates: true });
  }
  // 관계(AI 추정 연결선, a < b)
  const rel = out.relations
    .map((r) => {
      const x = byName.get(r.a);
      const y = byName.get(r.b);
      if (!x || !y) return null;
      const [a, b] = x < y ? [x, y] : [y, x];
      return { work_id: workId, a, b, kind: 'ai', label: r.label, weight: 1, evidence: r.evidence, direction: 'none' };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
  if (rel.length) await admin.from('links').upsert(rel, { onConflict: 'a,b,kind,direction', ignoreDuplicates: true });
  // 회수 추정: 상태는 바꾸지 않고 제안만(장면 칸은 비워 규칙 등장 기록과 겹치지 않게)
  for (const r of out.resolutions) {
    await admin.from('appearances').insert({ item_id: byName.get(r.item_name), episode_id: episodeId, chunk_id: null, evidence: r.evidence, source: 'ai', role: 'resolve' });
  }
  await admin.from('episodes').update({ analyzed_at: new Date().toISOString() }).eq('id', episodeId);
  await addUsage(admin, userId, 'text');
  return {
    summary: out.summary,
    counts: { new_items: out.new_items.length, aliases: out.aliases.length, relations: rel.length, resolutions: out.resolutions.length },
    dropped: raw.new_items.length + raw.aliases.length + raw.relations.length + raw.resolutions.length - (out.new_items.length + out.aliases.length + out.relations.length + out.resolutions.length),
  };
});
