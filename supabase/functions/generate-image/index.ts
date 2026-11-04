// 삽화(BUILD_SPEC 8.9). 입력 { workId, purpose, itemIds, scene, style, ratio, referencePath? }.
// 요청 문장에 고른 항목의 외모를 항상 넣고, 이미지 시트가 있으면 참조 이미지로 보낸다. 실패하면 사용량을 올리지 않는다.
import { HttpError, requireOwnWork, requireUser, serve, str } from '../_shared/http.ts';
import { addUsage, checkLimit } from '../_shared/limits.ts';
import { generateImage } from '../_shared/openai.ts';
import { DEFAULT_RATIO, buildImagePrompt, type ImagePurpose, type ImageRatio, type PromptItem } from '../_shared/imagePrompt.ts';

const PURPOSES: ImagePurpose[] = ['sketch', 'illustration', 'cover', 'sheet'];
const RATIOS: ImageRatio[] = ['3:4', '4:3', '1:1'];
const MAX_REFS = 4;

serve(async (ctx) => {
  const userId = requireUser(ctx);
  const workId = str(ctx.body, 'workId');
  const purpose = str(ctx.body, 'purpose') as ImagePurpose;
  if (!PURPOSES.includes(purpose)) throw new HttpError('bad_request', '용도를 골라 주세요.');
  const ratio = RATIOS.includes(ctx.body.ratio as ImageRatio) ? (ctx.body.ratio as ImageRatio) : DEFAULT_RATIO[purpose];
  const itemIds = Array.isArray(ctx.body.itemIds) ? (ctx.body.itemIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  const scene = typeof ctx.body.scene === 'string' ? ctx.body.scene.slice(0, 600) : '';
  const { admin } = ctx;
  const work = await requireOwnWork(admin, userId, workId);
  await checkLimit(admin, userId, 'image');

  const { data: rows, error } = itemIds.length
    ? await admin.from('items').select('id, name, kind, look, reference_image_path').eq('work_id', workId).in('id', itemIds)
    : { data: [], error: null };
  if (error) throw error;
  const items = (rows ?? []) as (PromptItem & { id: string; reference_image_path: string | null })[];
  const { data: w } = await admin.from('works').select('art_style').eq('id', work.id).single();
  const style = typeof ctx.body.style === 'string' && ctx.body.style.trim() ? ctx.body.style.slice(0, 100) : ((w?.art_style as string) ?? '');

  // 참조 이미지: 고른 항목의 이미지 시트 + "이 이미지로 다시 그리기"의 원본(내 작품 폴더 안의 것만)
  const refPaths = [...new Set([...items.map((i) => i.reference_image_path).filter((p): p is string => Boolean(p)), ...(typeof ctx.body.referencePath === 'string' ? [ctx.body.referencePath] : [])])]
    .filter((p) => p.startsWith(`${workId}/`))
    .slice(0, MAX_REFS);
  const references = [];
  for (const path of refPaths) {
    const { data: blob } = await admin.storage.from('images').download(path);
    if (blob) references.push({ name: path.split('/').pop()!, bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type || 'image/png' });
  }

  const prompt = buildImagePrompt({ purpose, style, scene, items, hasReference: references.length > 0 });
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
