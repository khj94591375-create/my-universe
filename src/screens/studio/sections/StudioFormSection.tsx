import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { KindTag } from '../../../components/Badges';
import { SelectField, TextArea, TextField } from '../../../components/TextField';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { callAi } from '../../../data/ai';
import type { StoredImage } from '../../../data/images';
import type { ItemView } from '../../../data/types';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import { DEFAULT_RATIO, buildImagePrompt, type ImagePurpose, type ImageRatio } from '../../../../supabase/functions/_shared/imagePrompt';
import s from './studio.module.css';

export type StudioPrefill = { purpose: ImagePurpose; itemIds: string[]; referencePath?: string; nonce?: number };

const PURPOSES: ImagePurpose[] = ['sketch', 'illustration', 'cover', 'sheet'];
const RATIOS: ImageRatio[] = ['3:4', '4:3', '1:1'];

/** 한도가 다시 채워지는 시각(한국 오전 9시 = UTC 0시)까지 남은 시간 */
function untilReset() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const min = Math.ceil((next - now.getTime()) / 60000);
  return { h: Math.floor(min / 60), m: min % 60 };
}

/** 만들기: 용도, 항목, 자동 묘사(설정집 look), 장면, 화풍, 비율, 남은 횟수. */
export function StudioFormSection({ workId, prefill, onCreated }: { workId: string; prefill: StudioPrefill | null; onCreated: (img: StoredImage) => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [purpose, setPurpose] = useState<ImagePurpose>('illustration');
  const [ratio, setRatio] = useState<ImageRatio>(DEFAULT_RATIO.illustration);
  const [picked, setPicked] = useState<string[]>([]);
  const [scene, setScene] = useState('');
  const [style, setStyle] = useState('');
  const [referencePath, setReferencePath] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (work?.art_style && !style) setStyle(work.art_style);
  }, [work?.art_style]);

  // "이 이미지로 다시 그리기"
  useEffect(() => {
    if (!prefill) return;
    setPurpose(prefill.purpose);
    setRatio(DEFAULT_RATIO[prefill.purpose]);
    setPicked(prefill.itemIds);
    setReferencePath(prefill.referencePath);
  }, [prefill]);

  const chosen = useMemo(() => (data ? picked.map((id) => data.itemById.get(id)).filter((i): i is ItemView => Boolean(i)) : []), [data, picked]);
  const hasSheet = chosen.some((i) => i.reference_image_path) || Boolean(referencePath);
  const prompt = buildImagePrompt({ purpose, style, scene, items: chosen.map((i) => ({ name: i.name, kind: i.kind, look: i.look })), hasReference: hasSheet });
  if (!data) return null;

  const st = ai.status;
  const imageOn = Boolean(st?.imageEnabled);
  const remaining = st?.usage ? Math.max(0, st.limits.image - st.usage.image) : null;
  const reason = !canWrite ? copy.shell.loginToWrite : !imageOn ? copy.studio.noKey : remaining === 0 ? copy.studio.limitHit(untilReset().h, untilReset().m) : null;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const create = async () => {
    if (chosen.length === 0 && !scene.trim()) return showToast(copy.studio.needSomething);
    setBusy(true);
    try {
      const r = await callAi<{ image: StoredImage }>('generate-image', { workId, purpose, itemIds: picked, scene, style, ratio, referencePath });
      showToast(copy.studio.created);
      onCreated(r.image);
    } catch (e) {
      showToast(aiErrorMessage(e), 'error');
    }
    setBusy(false);
    refreshAiStatus();
  };

  const group = (items: ItemView[], title: string) => (
    <fieldset className={s.group}>
      <legend>{title}</legend>
      {items.length === 0 ? (
        <span className={s.muted}>{copy.studio.noneItems}</span>
      ) : (
        items.map((i) => (
          <label key={i.id} className={picked.includes(i.id) ? `${s.pick} ${s.pickOn}` : s.pick}>
            <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} />
            {i.name}
            {i.reference_image_path && <span className={s.sheetDot} title={copy.bible.sheet} aria-label={copy.bible.sheet}>◐</span>}
          </label>
        ))
      )}
    </fieldset>
  );

  return (
    <Card className={s.form}>
      <fieldset className={s.group}>
        <legend>{copy.studio.purpose}</legend>
        {PURPOSES.map((p) => (
          <label key={p} className={purpose === p ? `${s.pick} ${s.pickOn}` : s.pick}>
            <input
              type="radio"
              name="purpose"
              checked={purpose === p}
              onChange={() => {
                setPurpose(p);
                setRatio(DEFAULT_RATIO[p]);
              }}
            />
            {copy.studio.purposes[p]}
          </label>
        ))}
      </fieldset>
      {group(data.items.filter((i) => i.kind === 'character'), copy.studio.characters)}
      {group(data.items.filter((i) => i.kind !== 'character'), copy.studio.places)}

      <div className={s.looks}>
        <h2 className={s.lookHead}>{copy.studio.lookTitle}</h2>
        {chosen.length === 0 ? (
          <p className={s.muted}>{copy.studio.lookEmpty}</p>
        ) : (
          <ul>
            {chosen.map((i) => (
              <li key={i.id}>
                <strong>{i.name}</strong> <KindTag kind={i.kind} /> {i.look || <span className={s.muted}>{copy.studio.lookMissing}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <TextArea label={copy.studio.scene} placeholder={copy.studio.scenePlaceholder} value={scene} onChange={(e) => setScene(e.target.value)} rows={3} maxLength={600} />
      <div className={s.row}>
        <TextField label={copy.studio.style} value={style} onChange={(e) => setStyle(e.target.value)} maxLength={100} />
        <SelectField label={copy.studio.ratio} value={ratio} onChange={(e) => setRatio(e.target.value as ImageRatio)} options={RATIOS.map((r) => [r, copy.studio.ratios[r]])} />
      </div>
      {referencePath && <p className={s.muted}>{copy.studio.redrawHint}</p>}

      <details className={s.preview}>
        <summary>{copy.studio.promptPreview}</summary>
        <pre>{prompt}</pre>
      </details>

      {st?.usage && <p className={s.muted}>{copy.studio.remaining(remaining ?? 0, st.limits.image)}</p>}
      <Button variant="accent" block onClick={create} loading={busy} disabled={Boolean(reason)} title={reason ?? undefined}>
        {busy ? copy.studio.creating : copy.studio.create}
      </Button>
      {reason && <p className={s.muted}>{reason}</p>}
    </Card>
  );
}
