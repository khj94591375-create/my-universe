/*
 * OpenAI 이미지 호출(BUILD_SPEC 8.9). 키가 없으면 AI 꺼짐. 참조 이미지(이미지 시트)가 있으면 함께 보낸다.
 */
import { OpenAI, toFile } from './deps.ts';
import { HttpError } from './http.ts';
import { emailAllowed } from './allow.ts';
import type { ImageRatio } from './imagePrompt.ts';
import { SIZE } from './imagePrompt.ts';

export function imageEnabled() {
  return Boolean(Deno.env.get('OPENAI_API_KEY'));
}

/**
 * 삽화를 쓸 수 있는 사람 제한(테스트 기간 등): 비밀값 IMAGE_ALLOWED_EMAILS(쉼표로 여러 개)가 있으면 그 이메일만.
 * 비어 있으면 모두 쓸 수 있다. 이메일은 비밀값에만 두고 저장소에는 넣지 않는다.
 */
export function imageAllowed(email: string | null): boolean {
  return emailAllowed(Deno.env.get('IMAGE_ALLOWED_EMAILS') ?? '', email);
}



/** 모델 이름은 OPENAI_IMAGE_MODEL로 정한다(BUILD_SPEC 3.2: 구현 시점에 OpenAI 문서에서 확인). */
export function imageModel() {
  return Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-2';
}

/** 그림 한 장을 만들어 PNG 바이트로 돌려준다. TODO(미정): 1회 생성 장수(1장 또는 2장) — 지금은 1장. */
export async function generateImage(prompt: string, ratio: ImageRatio, references: { name: string; bytes: Uint8Array; type: string }[]): Promise<Uint8Array> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new HttpError('ai_off', '이미지 키가 아직 없어요.');
  const client = new OpenAI({ apiKey, timeout: 55_000, maxRetries: 0 });
  try {
    const res = references.length
      ? await client.images.edit({
          model: imageModel(),
          image: await Promise.all(references.map((r) => toFile(r.bytes, r.name, { type: r.type }))),
          prompt,
          size: SIZE[ratio],
          n: 1,
        })
      : await client.images.generate({ model: imageModel(), prompt, size: SIZE[ratio], n: 1, output_format: 'png' });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new HttpError('ai_failed', '그림을 받지 못했어요.');
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof OpenAI.AuthenticationError) throw new HttpError('ai_off', '이미지 키가 맞지 않아요.');
    console.error('image failed:', e instanceof OpenAI.APIError ? `api ${e.status}` : e instanceof Error ? e.name : 'unknown');
    throw new HttpError('ai_failed', '그림을 만들지 못했어요.');
  }
}
