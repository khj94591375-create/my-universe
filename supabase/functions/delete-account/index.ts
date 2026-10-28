// 계정 삭제(BUILD_SPEC 6.11, 10장): 내 작품·회차·이미지 파일을 모두 지우고 로그인 계정도 지운다. 되돌릴 수 없다.
import { HttpError, requireUser, serve } from '../_shared/http.ts';

serve(async (ctx) => {
  const userId = requireUser(ctx);
  if (ctx.body.confirm !== true) throw new HttpError('bad_request', '확인이 필요해요.');
  const { admin } = ctx;
  const { data: works } = await admin.from('works').select('id').eq('owner_id', userId);
  const bucket = admin.storage.from('images');
  for (const w of (works ?? []) as { id: string }[]) {
    for (;;) {
      const { data: files } = await bucket.list(w.id, { limit: 100 });
      if (!files || files.length === 0) break;
      await bucket.remove(files.map((f) => `${w.id}/${f.name}`));
      if (files.length < 100) break;
    }
  }
  await admin.from('works').delete().eq('owner_id', userId); // 회차·항목 등은 cascade
  const { error } = await admin.auth.admin.deleteUser(userId); // ai_usage도 cascade
  if (error) throw error;
  return { deleted: true };
});
