// AI가 켜져 있는지(키가 있는지)와 오늘 사용량. 화면이 AI 버튼을 켜고 끌 때 쓴다.
import { serve } from '../_shared/http.ts';
import { aiEnabled } from '../_shared/claude.ts';
import { dailyLimits, usageToday } from '../_shared/limits.ts';

serve(async ({ admin, userId }) => ({
  enabled: aiEnabled(),
  limits: dailyLimits(),
  usage: userId ? await usageToday(admin, userId) : null,
}));
