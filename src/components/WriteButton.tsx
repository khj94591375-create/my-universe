import type { ComponentProps } from 'react';
import { copy } from '../config/copy';
import { useCanWrite, useWork } from '../features/works/useWork';
import { Button } from './Button';
import s from './Feedback.module.css';

/**
 * 작품에 무언가를 쓰는 버튼. 내 작품이 아니면(예시 작품, 로그인 안 함) 비활성 + 안내 문구.
 * 쓰기 버튼은 이 부품을 쓰면 예시 작품에서 자동으로 막힌다(BUILD_SPEC 6.1).
 */
export function WriteButton({ workId, disabled, ...rest }: ComponentProps<typeof Button> & { workId: string }) {
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  if (!canWrite) {
    return (
      <span className={s.writeBlocked}>
        <Button {...rest} disabled title={copy.shell.loginToWrite} />
        <small>{copy.shell.loginToWrite}</small>
      </span>
    );
  }
  return <Button {...rest} disabled={disabled} />;
}
