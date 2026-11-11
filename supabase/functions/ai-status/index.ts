// AI가 켜져 있는지(키가 있는지)와 오늘 사용량. 화면이 AI 버튼을 켜고 끌 때 쓴다.
import { serve } from '../_shared/http.ts';
import { aiEnabled } from '../_shared/claude.ts';
import { dailyLimits, usageToday } from '../_shared/limits.ts';
import { imageAllowed, imageEnabled } from '../_shared/openai.ts';

serve(async ({ admin, userId, userEmail }) => ({
  enabled: aiEnabled(),
  imageEnabled: imageEnabled() && imageAllowed(userEmail),
  // 키는 있지만 이 사람에게는 잠시 꺼 둠(IMAGE_ALLOWED_EMAILS)
  imageRestricted: imageEnabled() && !imageAllowed(userEmail),
  limits: dailyLimits(),
  usage: userId ? await usageToday(admin, userId) : null,
}));
