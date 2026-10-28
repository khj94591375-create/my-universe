import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmBar } from '../../components/ConfirmBar';
import { showToast } from '../../components/Toast';
import { copy } from '../../config/copy';
import { isSupabaseConfigured } from '../../lib/supabase';
import { callAi } from '../../data/ai';
import { deleteAllMyWorks, exportMyData } from '../../data/account';
import { toMessage } from '../../data/errors';
import { signOut } from '../../features/auth/auth';
import { useSession } from '../../features/auth/SessionProvider';
import { aiErrorMessage, useAiStatus } from '../../features/ai/aiStatus';
import { clearWorkData } from '../../features/works/workData';
import s from './settings.module.css';

/** 내 설정(BUILD_SPEC 6.11): 계정, 오늘 AI 사용량, 데이터 내보내기, 로그아웃, 데이터·계정 삭제. */
export default function SettingsScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const nav = useNavigate();
  const ai = useAiStatus();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'all' | 'account' | null>(null);

  const logout = async () => {
    setBusy('logout');
    try {
      await signOut();
    } finally {
      nav('/', { replace: true });
    }
  };

  const doExport = async () => {
    setBusy('export');
    try {
      const file = await exportMyData(userId);
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-universe-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(copy.settings.exported);
    } catch (e) {
      showToast(`${copy.toast.failed} (${toMessage(e)})`, 'error');
    }
    setBusy(null);
  };

  const doDeleteAll = async () => {
    setBusy('all');
    try {
      const n = await deleteAllMyWorks(userId);
      clearWorkData();
      showToast(copy.settings.deleteAllDone(n));
    } catch (e) {
      showToast(`${copy.toast.failed} (${toMessage(e)})`, 'error');
    }
    setBusy(null);
    setConfirm(null);
  };

  const doDeleteAccount = async () => {
    setBusy('account');
    try {
      await callAi('delete-account', { confirm: true });
      await signOut().catch(() => undefined);
      nav('/', { replace: true });
    } catch (e) {
      showToast(aiErrorMessage(e), 'error');
      setBusy(null);
      setConfirm(null);
    }
  };

  // 함수가 올라가 있으면(키가 없어도) 계정 삭제를 쓸 수 있다
  const serverReady = ai.status != null;
  const st = ai.status;

  return (
    <div className={s.page}>
      <h1 className={s.title}>{copy.settings.title}</h1>
      <Card title={copy.settings.account}>
        <p className={s.sub}>{copy.settings.email}</p>
        <p className={s.email}>{session?.user.email ?? '-'}</p>
        <Button variant="ghost" onClick={logout} loading={busy === 'logout'}>
          {copy.settings.logout}
        </Button>
      </Card>

      <Card title={copy.settings.usageTitle}>
        {st?.usage ? (
          <div className={s.usage}>
            <UsageBar label={copy.settings.usageText(st.usage.text, st.limits.text)} used={st.usage.text} limit={st.limits.text} />
            <UsageBar label={copy.settings.usageImage(st.usage.image, st.limits.image)} used={st.usage.image} limit={st.limits.image} />
          </div>
        ) : (
          <p>{copy.settings.usageOff}</p>
        )}
        {!ai.on && ai.reason && <p className={s.sub}>{ai.reason}</p>}
        <p className={s.sub}>{copy.settings.usageNote}</p>
      </Card>

      <Card title={copy.settings.dataTitle}>
        <div className={s.actions}>
          <Button onClick={doExport} loading={busy === 'export'}>
            {busy === 'export' ? copy.settings.exporting : copy.settings.export}
          </Button>
        </div>
        <p className={s.sub}>{copy.settings.exportHint}</p>
        <div className={s.danger}>
          {confirm === 'all' ? (
            <ConfirmBar message={copy.settings.deleteAllConfirm} confirmLabel={copy.settings.yesDelete} cancelLabel={copy.settings.cancel} busy={busy === 'all'} onConfirm={doDeleteAll} onCancel={() => setConfirm(null)} />
          ) : confirm === 'account' ? (
            <ConfirmBar message={copy.settings.deleteAccountConfirm} confirmLabel={copy.settings.deleteAccount} cancelLabel={copy.settings.cancel} busy={busy === 'account'} onConfirm={doDeleteAccount} onCancel={() => setConfirm(null)} />
          ) : (
            <div className={s.actions}>
              <Button variant="ghost" onClick={() => setConfirm('all')}>
                {copy.settings.deleteAll}
              </Button>
              <Button variant="danger" onClick={() => setConfirm('account')} disabled={!serverReady} title={serverReady ? undefined : copy.settings.deleteAccountOff}>
                {copy.settings.deleteAccount}
              </Button>
            </div>
          )}
          {!serverReady && <p className={s.sub}>{copy.settings.deleteAccountOff}</p>}
        </div>
      </Card>

      <Card title={copy.settings.connection}>
        <p>{isSupabaseConfigured ? copy.settings.connected : copy.settings.notConnected}</p>
      </Card>
      <Link to="/works">{copy.common.back}</Link>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className={s.usageRow}>
      <span>{label}</span>
      <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={label}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
