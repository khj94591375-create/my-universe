// 삽화(BUILD_SPEC 8.9). 입력 { workId, purpose, itemIds, scene, style, ratio, referencePath? }.
// 요청 문장에 고른 항목의 외모를 항상 넣고, 이미지 시트가 있으면 참조 이미지로 보낸다. 실패하면 사용량을 올리지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { generateImage, imageAllowed } from '../_shared/openai.ts';
import { DEFAULT_RATIO, MAX_REFS, buildImagePrompt, numberReferences, type ImagePurpose, type ImageRatio, type PromptItem } from '../_shared/imagePrompt.ts';

const PURPOSES: ImagePurpose[] = ['sketch', 'illustration', 'cover', 'sheet'];
const RATIOS: ImageRatio[] = ['3:4', '4:3', '1:1'];

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const purpose = str(ctx.body, 'purpose') as ImagePurpose;
  if (!PURPOSES.includes(purpose)) throw new HttpError('bad_request', '용도를 골라 주세요.');
  const ratio = RATIOS.includes(ctx.body.ratio as ImageRatio) ? (ctx.body.ratio as ImageRatio) : DEFAULT_RATIO[purpose];
  const itemIds = Array.isArray(ctx.body.itemIds) ? (ctx.body.itemIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  const scene = typeof ctx.body.scene === 'string' ? ctx.body.scene.slice(0, 600) : '';
  const { admin } = ctx;
  if (!imageAllowed(ctx.userEmail)) throw new HttpError('forbidden', '삽화 기능은 지금 쉬고 있어요.');
  const work = await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'image');

  const { data: rows, error } = itemIds.length
    ? await admin.from('items').select('id, name, kind, look, reference_image_path').eq('work_id', workId).in('id', itemIds)
    : { data: [], error: null };
  if (error) throw error;
  const items = (rows ?? []) as (PromptItem & { id: string; reference_image_path: string | null })[];
  const { data: w } = await admin.from('works').select('art_style').eq('id', work.id).single();
  const style = typeof ctx.body.style === 'string' && ctx.body.style.trim() ? ctx.body.style.slice(0, 100) : ((w?.art_style as string) ?? '');

  // 참조 이미지: 고른 항목의 이미지 시트(고른 순서) + "이 이미지로 다시 그리기"의 원본(내 작품 폴더 안의 것만).
  // 실제로 내려받은 것만 번호를 매겨, 요청 문장의 "참조 이미지 n번 = 이름"과 보내는 순서를 맞춘다.
  type Ref = { name: string; bytes: Uint8Array; type: string };
  const load = async (path: string | null | undefined): Promise<Ref | null> => {
    if (!path || !path.startsWith(`${workId}/`)) return null;
    const { data: blob } = await admin.storage.from('images').download(path);
    return blob ? { name: path.split('/').pop()!, bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type || 'image/png' } : null;
  };
  const ordered = itemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is (typeof items)[number] => Boolean(i));
  const sheets: (Ref | null)[] = [];
  for (const it of ordered) sheets.push(sheets.filter(Boolean).length < MAX_REFS ? await load(it.reference_image_path) : null);
  const redrawPath = typeof ctx.body.referencePath === 'string' ? ctx.body.referencePath : null;
  const redraw = redrawPath && !ordered.some((i) => i.reference_image_path === redrawPath) ? await load(redrawPath) : null;
  const numbered = numberReferences(
    ordered.map((it, k) => ({ name: it.name, kind: it.kind, look: it.look, hasRef: Boolean(sheets[k]) })),
    Boolean(redraw),
  );
  const references: Ref[] = [];
  numbered.items.forEach((it, k) => {
    if (it.ref != null) references[it.ref - 1] = sheets[k]!;
  });
  if (numbered.redrawRef != null && redraw) references[numbered.redrawRef - 1] = redraw;
  const promptItems: PromptItem[] = numbered.items.map(({ name, kind, look, ref }) => ({ name, kind, look, ref }));

  const prompt = buildImagePrompt({ purpose, style, scene, items: promptItems, hasReference: references.length > 0, redrawRef: numbered.redrawRef });
  const png = await generateImage(prompt, ratio, references);

  const id = crypto.randomUUID();
  const path = `${workId}/${id}.png`;
  const up = await admin.storage.from('images').upload(path, png, { contentType: 'image/png' });
  if (up.error) throw up.error;
  const ins = await admin.from('images').insert({ id, work_id: workId, purpose, item_ids: itemIds, prompt, storage_path: path });
  if (ins.error) {
    await admin.storage.from('images').remove([path]);
    throw ins.error;
  }
  await addUsage(admin, userId, 'image'); // 성공했을 때만
  return { image: { id, purpose, item_ids: itemIds, prompt, storage_path: path } };
});
