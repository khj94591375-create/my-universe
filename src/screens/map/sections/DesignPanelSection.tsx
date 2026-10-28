import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Chip, EvidenceQuote } from '../../../components/Badges';
import { Tag } from '../../../components/Tag';
import { TextField } from '../../../components/TextField';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { callAi, type ChatResult, type DesignResult } from '../../../data/ai';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

type ChatMsg = { role: 'user' | 'assistant'; content: string; evidence?: ChatResult['evidence'] };
const epOf = (tag: string) => Number(/E(\d+)/.exec(tag)?.[1]) || null;

/**
 * 오른쪽 패널: 고른 별(칩), 이어 쓸 지점, 본문 초안 스위치(기본 꺼짐) [고정], 다음 회차 설계하기, 대화창(BUILD_SPEC 6.7, 8.6, 8.7).
 * AI가 꺼져 있으면 설계·대화는 이유와 함께 비활성. 지도는 그대로 동작한다.
 */
export function DesignPanelSection({ workId, selected, onRemove }: { workId: string; selected: string[]; onRemove: (id: string) => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [includeDraft, setIncludeDraft] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [designing, setDesigning] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatting, setChatting] = useState(false);
  if (!data) return null;

  const last = data.episodes[data.episodes.length - 1];
  const chosen = selected.map((id) => data.itemById.get(id)).filter((i) => i != null);
  const usable = canWrite && ai.on;
  const reason = !canWrite ? copy.shell.loginToWrite : ai.reason;

  const design = async () => {
    if (chosen.length === 0) return showToast(copy.map.panel.needSelect);
    setDesigning(true);
    try {
      const r = await callAi<DesignResult>('design-next', { workId, itemIds: chosen.map((i) => i.id), targetEp: data.next, includeDraft });
      setResult(r);
      setMessages([]);
    } catch (e) {
      showToast(aiErrorMessage(e), 'error');
    }
    setDesigning(false);
    refreshAiStatus();
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !result) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setChatting(true);
    try {
      const r = await callAi<ChatResult>('chat', { sessionId: result.sessionId, message: text });
      setMessages((m) => [...m, { role: 'assistant', content: r.reply, evidence: r.evidence }]);
    } catch (err) {
      showToast(aiErrorMessage(err), 'error');
      setInput(text); // 입력한 내용은 그대로 남긴다(8.10)
      setMessages((m) => m.slice(0, -1));
    }
    setChatting(false);
    refreshAiStatus();
  };

  return (
    <Card className={s.panel}>
      <div className={s.panelBlock}>
        <h3>{copy.map.panel.selected}</h3>
        {chosen.length ? (
          <div className={s.chips}>
            {chosen.map((i) => (
              <Chip key={i.id} onRemove={() => onRemove(i.id)}>
                {i.name}
              </Chip>
            ))}
          </div>
        ) : (
          <p className={s.muted}>{copy.map.panel.selectedEmpty}</p>
        )}
      </div>
      <div className={s.panelBlock}>
        <h3>{copy.map.panel.continueFrom}</h3>
        <p>{last ? copy.map.panel.continueText(last.no, last.title ?? `${last.no}화`) : copy.map.panel.continueFirst}</p>
      </div>
      <label className={s.switch}>
        <input type="checkbox" role="switch" checked={includeDraft} disabled={!usable} onChange={(e) => setIncludeDraft(e.target.checked)} aria-describedby="draft-hint" />
        <span>{copy.map.panel.draftSwitch}</span>
      </label>
      <p id="draft-hint" className={s.muted}>
        {copy.map.panel.draftHint}
      </p>
      <Button variant="accent" block disabled={!usable || chosen.length === 0} loading={designing} title={reason ?? undefined} onClick={design}>
        {designing ? copy.map.panel.designing : result ? copy.map.panel.again : copy.map.panel.design}
      </Button>
      {reason && <p className={s.muted}>{reason}</p>}

      {result && (
        <div className={s.panelBlock}>
          <h3>
            {copy.map.panel.resultTitle(result.targetEp)} <Tag tone="ai">{copy.ai.suggestion}</Tag>
          </h3>
          <ol className={s.scenes}>
            {result.scenes.map((sc) => (
              <li key={sc.no}>
                <strong>{copy.map.panel.sceneLabel(sc.no)}</strong>
                <p>{sc.text}</p>
                {sc.uses.map((u, k) =>
                  u.evidence ? (
                    <EvidenceQuote key={k} text={u.evidence} ep={epOf(u.tag)}>
                      <span>{u.item}</span>
                    </EvidenceQuote>
                  ) : (
                    <p key={k} className={s.muted}>
                      {u.item} · {copy.ai.noEvidenceShort}
                    </p>
                  ),
                )}
              </li>
            ))}
          </ol>
          {result.missing.length > 0 && <p className={s.muted}>{copy.map.panel.missing(result.missing)}</p>}
          {result.draft && (
            <div className={s.draft}>
              <h3>{copy.map.panel.draftTitle}</h3>
              <p>{result.draft}</p>
            </div>
          )}
        </div>
      )}

      {result ? (
        <div className={s.chat}>
          <ul className={s.chatList} aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={m.role === 'user' ? s.chatUser : s.chatAi}>
                <span className={s.chatWho}>{m.role === 'user' ? copy.map.panel.you : copy.map.panel.assistant}</span>
                <p>{m.content}</p>
                {m.evidence?.map((ev, k) =>
                  ev.text ? <EvidenceQuote key={k} text={ev.text} ep={epOf(ev.tag)} /> : <p key={k} className={s.muted}>{copy.ai.noEvidenceShort}</p>,
                )}
              </li>
            ))}
            {chatting && <li className={s.muted}>{copy.map.panel.chatThinking}</li>}
          </ul>
          <form className={s.chatForm} onSubmit={send}>
            <TextField label={copy.map.panel.chatPlaceholder} hideLabel placeholder={copy.map.panel.chatPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} disabled={chatting} maxLength={2000} />
            <Button type="submit" size="sm" disabled={chatting || !input.trim()}>
              {copy.map.panel.chatSend}
            </Button>
          </form>
        </div>
      ) : (
        <p className={s.chatNote}>{copy.map.panel.chat}</p>
      )}
    </Card>
  );
}
