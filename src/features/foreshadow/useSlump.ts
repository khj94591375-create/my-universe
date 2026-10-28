import { useNavigate } from 'react-router-dom';
import { copy } from '../../config/copy';
import { showToast } from '../../components/Toast';
import { useWorkData } from '../works/workData';
import { pickSlumpItem } from './slump';

const LAST_KEY = 'mu:lastSlump';

function readLast(): string | null {
  try {
    return sessionStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/** "막혔어요" 동작: 항목을 골라 잊힌 복선 찾기 화면에서 그 항목의 가이드를 연다(BUILD_SPEC 7.2). */
export function useSlump(workId: string) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  return () => {
    if (!data) return;
    const id = pickSlumpItem(data.items, readLast());
    if (!id) {
      showToast(copy.toast.noSlump);
      return;
    }
    try {
      sessionStorage.setItem(LAST_KEY, id);
    } catch {
      /* 저장 못 해도 동작에는 문제없음 */
    }
    nav(`/w/${workId}/forgot?item=${id}`);
  };
}

/** 오래 잊힌 순서: 미회수·재사용 예정이고 등장 기록이 있으며 이번 화에 나오지 않은 항목. */
export function forgottenItems<T extends { status: string; gap: number | null }>(items: T[]): T[] {
  return items
    .filter((i) => (i.status === 'open' || i.status === 'reuse_planned') && i.gap != null && i.gap > 0)
    .sort((x, y) => (y.gap as number) - (x.gap as number));
}
