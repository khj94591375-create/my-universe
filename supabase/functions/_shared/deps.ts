// 외부 패키지는 여기서만 버전을 고정해 불러온다(Deno, Supabase Edge Functions).
export { default as Anthropic } from 'npm:@anthropic-ai/sdk@0.134.0';
export { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@0.134.0/helpers/beta/zod';
export { z } from 'npm:zod@4.6.7';
export { createClient } from 'npm:@supabase/supabase-js@2.117.3';
export type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';
export { default as OpenAI, toFile } from 'npm:openai@7.41.0';
