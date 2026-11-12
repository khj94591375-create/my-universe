// 다음 회차 설계(BUILD_SPEC 8.6). 입력 { workId, itemIds, targetEp, includeDraft }.
// [고정] includeDraft가 false면 서버에서 draft를 지운다. 결과는 design_sessions에 저장한다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { askJson } from '../_shared/claude.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { loadSnapshot, retrieve } from '../_shared/retrieval.ts';
import { finishDesign, finishEnding } from '../_shared/rules.ts';
import { lastPositions, rankFocus } from '../_shared/focus.ts';
import { designSchema } from '../_shared/schemas.ts';
import { DESIGN_SYSTEM } from '../_shared/prompts.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const itemIds = Array.isArray(ctx.body.itemIds) ? (ctx.body.itemIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const includeDraft = ctx.body.includeDraft === true;
  // 초안 길이는 300자 또는 800자만(다른 값은 300)
  const draftLength = ctx.body.draftLength === 800 ? 800 : 300;
  if (itemIds.length === 0) throw new HttpError('bad_request', '항목을 하나 이상 골라 주세요.');
  const { admin } = ctx;
  await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'text');
  const snap = await loadSnapshot(admin, workId);
  const chosen = snap.items.filter((i) => itemIds.includes(i.id));
  if (chosen.length === 0) throw new HttpError('not_found', '고른 항목을 찾을 수 없어요.');
  const targetEp = Number(ctx.body.targetEp) || (snap.episodes.at(-1)?.no ?? 0) + 1;
  // 직전 회차의 마지막 장면을 항상 함께(다음 회차가 매끄럽게 이어지게)
  const context = await retrieve(admin, workId, chosen.map((i) => i.name).join(' '), itemIds, snap, { withEnding: true });
  // 별을 많이 고르면 직전 장면·최근 회차와 이어진 별을 중심으로(개연성), 나머지는 곁들이거나 다음으로
  const latestEp = snap.episodes.at(-1)?.no ?? null;
  // 같은 회차 안에서도 더 뒤 장면에 나온 별을 먼저: 고른 별의 등장 기록으로 마지막 장면 번호를 구한다
  const chosenApps = snap.appearances.filter((a) => itemIds.includes(a.item_id));
  const chunkIds = [...new Set(chosenApps.map((a) => a.chunk_id).filter((c): c is string => Boolean(c)))];
  const { data: seqRows } = chunkIds.length ? await admin.from('chunks').select('id, seq').in('id', chunkIds) : { data: [] };
  const seqOf = new Map(((seqRows ?? []) as { id: string; seq: number }[]).map((c) => [c.id, c.seq]));
  const pos = lastPositions(chosenApps, new Map(snap.episodes.map((e) => [e.id, e.no])), seqOf);
  const { core, side } = rankFocus(
    chosen.map((i) => ({ ...i, lastSeq: pos.get(i.id)?.seq ?? null, count: pos.get(i.id)?.count ?? 0 })),
    context.endingTexts ?? [],
    latestEp,
  );
  const pick = `중심 별: ${core.map((i) => `「${i.name}」`).join(', ')}${side.length ? `\n곁들일 별: ${side.map((i) => `「${i.name}」`).join(', ')}` : ''}`;
  const out = await askJson({
    tier: 'main',
    system: DESIGN_SYSTEM,
    user: `${context.text}\n\n${targetEp}화를 설계한다.\n${pick}\n본문 초안 요청: ${includeDraft ? `있음(장면 1의 시작 부분, ${draftLength}자 이내)` : '없음(draft는 빈 문자열)'}\n장면 3개를 JSON으로 답하라.`,
    schema: designSchema,
  });
  const result = { ending: finishEnding(out.ending, Boolean(context.hasEnding), context.scenes), ...finishDesign({ ...out, scenes: out.scenes.slice(0, 3) }, includeDraft, context.scenes, draftLength) };
  // 빠진 별 경고는 중심 별만(곁들일 별은 미뤄도 됨)
  const missing = core.filter((i) => !result.scenes.some((s) => s.uses.some((u) => u.item === i.name))).map((i) => i.name);
  const sideNames = new Set(side.map((i) => i.name));
  const used = new Set(result.scenes.flatMap((s) => s.uses.map((u) => u.item)));
  const later = [
    ...(out.later ?? []).filter((l) => sideNames.has(l.item.trim()) && !used.has(l.item.trim())).map((l) => ({ item: l.item.trim(), reason: l.reason.trim() })),
    ...side.filter((i) => !used.has(i.name) && !(out.later ?? []).some((l) => l.item.trim() === i.name)).map((i) => ({ item: i.name, reason: '' })),
  ];
  const focus = core.map((i) => ({ name: i.name, why: i.why, agoEp: i.agoEp, lastEp: i.last_ep, lastSeq: i.lastSeq ?? null }));
  const { data: session, error } = await admin
    .from('design_sessions')
    .insert({ work_id: workId, target_ep: targetEp, selected_item_ids: itemIds, include_draft: includeDraft, messages: [{ role: 'design', content: { ...result, focus, later } }] })
    .select('id')
    .single();
  if (error) throw error;
  await addUsage(admin, userId, 'text');
  return { sessionId: session.id, targetEp, ...result, missing, focus, later };
});
