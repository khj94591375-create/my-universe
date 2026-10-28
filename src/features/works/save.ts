import { copy } from '../../config/copy';
import { toMessage } from '../../data/errors';
import { showToast } from '../../components/Toast';
import { refreshWorkData } from './workData';

/**
 * 저장 동작 공통 처리: 실행 → 작품 데이터 새로 고침 → 알림. 실패하면 오류 알림을 띄우고 false.
 */
export async function save(workId: string, fn: () => Promise<unknown>, done: string = copy.toast.saved): Promise<boolean> {
  try {
    await fn();
    refreshWorkData(workId);
    if (done) showToast(done);
    return true;
  } catch (e) {
    showToast(`${copy.toast.failed} (${toMessage(e)})`, 'error');
    refreshWorkData(workId);
    return false;
  }
}
