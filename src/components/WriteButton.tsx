import type { ComponentProps } from 'react';
import { copy } from '../config/copy';
import { useCanWrite, useWork } from '../features/works/useWork';
import { Button } from './Button';

/**
 * 작품에 무언가를 쓰는 버튼. 내 작품이 아니면(예시 작품, 로그인 안 함) 비활성(이유는 마우스를 올리면).
 * 화면마다 같은 안내 문구를 반복하지 않는다: 맨 위 "예시 작품 · 읽기 전용" 띠가 이미 알려 준다.
 * 쓰기 버튼은 이 부품을 쓰면 예시 작품에서 자동으로 막힌다(BUILD_SPEC 6.1).
 */
export function WriteButton({ workId, disabled, ...rest }: ComponentProps<typeof Button> & { workId: string }) {
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  if (!canWrite) {
    return <Button {...rest} disabled title={copy.shell.loginToWrite} />;
  }
  return <Button {...rest} disabled={disabled} />;
}
