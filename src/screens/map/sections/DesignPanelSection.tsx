import { useMemo, useState, type FormEvent } from 'react';
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
import { basicStoryIdea } from '../../../features/map/storyIdea';
import { demoDesign } from '../../../features/map/demoDesign';
import { linksAmong, linkKindText, relationText } from '../../../features/map/relations';
import { aiResolveEps } from '../../../features/map/stars';
import { StarDetailCard } from './StarDetailCard';
import type { MapFocus } from './MapCanvasSection';
import { Link } from 'react-router-dom';
import { useWorkData } from '../../../features/works/workData';
import s from './map.module.css';

type ChatMsg = { role: 'user' | 'assistant'; content: string; evidence?: ChatResult['evidence'] };
const epOf = (tag: string) => Number(/E(\d+)/.exec(tag)?.[1]) || null;

/**
 * 오른쪽 패널: ① 별 고르기 → ② 관계 확인 → ③ 이야기 설계(BUILD_SPEC 6.7, 8.6, 8.7).
 * AI가 꺼져 있으면 설계·대화는 이유와 함께 비활성. 지도는 그대로 동작한다.
 * AI 설계 결과·기본 제안·체험 결과는 어디에도 자동 저장하지 않는다(작가가 검토 후 직접 옮김).
 */
export function DesignPanelSection({ workId, selected, onRemove, onClear, focus }: { workId: string; selected: string[]; onRemove: (id: string) => void; onClear: () => void; focus: MapFocus }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const [includeDraft, setIncludeDraft] = useState(false);
  const [draftLength, setDraftLength] = useState<300 | 800>(300);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [designing, setDesigning] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [demo, setDemo] = useState(false);
  const aiResolve = useMemo(() => (data ? aiResolveEps(data.appearances, data.episodes) : new Map<string, number>()), [data]);
  if (!data) return null;

  const last = data.episodes[data.episodes.length - 1];
  const chosen = selected.map((id) => data.itemById.get(id)).filter((i) => i != null);
  const usable = canWrite && ai.on;
  const idea = basicStoryIdea(chosen, data.links, data.appearances, data.episodes);
  const reason = !canWrite ? copy.shell.loginToWrite : ai.reason;
  const isSample = Boolean(work?.is_sample);
  const among = linksAmong(data.links, chosen.map((i) => i.id));
  // 펼쳐 보여 줄 별: 지도에서 가리킨 별, 없으면 마지막으로 고른 별
  const openId = focus.focusId && selected.includes(focus.focusId) ? focus.focusId : selected[selected.length - 1];
  // 예시 작품 체험: 화면에서만 만든 결과(서버 호출·저장 없음)
  const shown: DesignResult | null = result ?? (demo && isSample ? demoDesign(chosen, data.links, data.appearances, data.episodes, data.next) : null);
  const isDemo = !result && Boolean(shown);
  const copyResult = async (r: DesignResult) => {
    const text = r.scenes.map((sc) => `${copy.map.panel.sceneLabel(sc.no)}\n${sc.text}`).join('\n\n') + (r.draft ? `\n\n${r.draft}` : '');
    try {
      await navigator.clipboard.writeText(text);
      showToast(copy.map.panel.copied);
    } catch {
      showToast(copy.map.panel.copyFail, 'error');
    }
  };

  const design = async () => {
    if (chosen.length === 0) return showToast(copy.map.panel.needSelect);
    setDesigning(true);
    try {
      const r = await callAi<DesignResult>('design-next', { workId, itemIds: chosen.map((i) => i.id), targetEp: data.next, includeDraft, draftLength });
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
      {/* ① 별 고르기 */}
      <section className={s.step} aria-labelledby="step1">
        <h2 id="step1" className={s.stepHead}>
          <span className={s.stepNo} aria-hidden="true">1</span>
          {copy.map.panel.step1}
        </h2>
        {chosen.length ? (
          <>
            <div className={s.chips}>
              {chosen.map((i) => (
                <Chip key={i.id} onRemove={() => onRemove(i.id)}>
                  {i.name}
                </Chip>
              ))}
            </div>
            <div>
              <Button variant="ghost" size="sm" onClick={onClear}>
                {copy.map.panel.clearAll}
              </Button>
            </div>
          </>
        ) : (
          <p className={s.muted}>{copy.map.panel.intro}</p>
        )}
      </section>

      {/* ② 관계 확인 */}
      <section className={s.step} aria-labelledby="step2">
        <h2 id="step2" className={s.stepHead} tabIndex={-1}>
          <span className={s.stepNo} aria-hidden="true">2</span>
          {copy.map.panel.step2}
        </h2>
        {chosen.length === 0 ? (
          <p className={s.muted}>{copy.map.panel.step2Empty}</p>
        ) : (
          <>
            {canWrite && chosen.length === 2 && (
              <Button
                block
                onClick={() => {
                  focus.setLinkFrom(chosen[0].id);
                  focus.setLinkTo(chosen[1].id);
                }}
              >
                {copy.map.panel.connectTwo(chosen[0].name, chosen[1].name)}
              </Button>
            )}
            {canWrite && chosen.length > 2 && <p className={s.muted}>{copy.map.panel.connectHint}</p>}
            {chosen.length > 1 && (
              <div className={s.among}>
                <h3 className={s.ideaSub}>{copy.map.panel.among}</h3>
                {among.length ? (
                  <ul className={s.linkedList}>
                    {among.map((l) => (
                      <li key={l.id}>
                        <button type="button" className={`${s.textBtn} ${focus.linkId === l.id ? s.textBtnOn : ''}`} aria-pressed={focus.linkId === l.id} onClick={() => focus.setLinkId(l.id)}>
                          「{data.itemById.get(l.a)?.name}」 {l.direction === 'forward' ? '→' : l.direction === 'backward' ? '←' : '—'} 「{data.itemById.get(l.b)?.name}」: {relationText(l)}
                          <span className={s.linkKind}> ({linkKindText(l)})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.muted}>{copy.map.panel.amongNone}</p>
                )}
              </div>
            )}
            {chosen.map((i) => (
              <StarDetailCard
                key={i.id}
                workId={workId}
                data={data}
                item={i}
                canWrite={canWrite}
                open={i.id === openId}
                aiResolveEp={i.kind === 'foreshadow' && i.status === 'open' ? aiResolve.get(i.id) ?? null : null}
                focus={focus}
                onRemove={onRemove}
              />
            ))}
          </>
        )}
      </section>

      {/* ③ 이야기 설계 */}
      <section className={s.step} aria-labelledby="step3">
        <h2 id="step3" className={s.stepHead}>
          <span className={s.stepNo} aria-hidden="true">3</span>
          {copy.map.panel.step3}
        </h2>
        {idea && (
          <div className={s.idea}>
            <h3 className={s.panelHead}>
              {copy.map.idea.title} <Tag>{copy.map.idea.tag}</Tag>
            </h3>
            {idea.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            <h4 className={s.ideaSub}>{copy.map.idea.evidence}</h4>
            {idea.evidence.map((ev) => (
              <EvidenceQuote key={ev.itemId} text={ev.text} ep={ev.ep}>
                <span>{ev.item}</span>
              </EvidenceQuote>
            ))}
            {idea.missing.length > 0 && (
              <p className={s.muted}>
                {idea.missing.map((n) => `「${n}」`).join(', ')} · {copy.map.idea.noEvidence}
              </p>
            )}
            <p className={s.muted}>{copy.map.idea.note}</p>
            <Link to={`/w/${workId}/forgot?item=${chosen[0].id}`} className={s.ideaLink}>
              {copy.map.idea.more} →
            </Link>
          </div>
        )}
        <div className={s.panelBlock}>
          <h3 className={s.panelHead}>{copy.map.panel.continueFrom}</h3>
          <p>{last ? copy.map.panel.continueText(last.no, last.title ?? `${last.no}화`) : copy.map.panel.continueFirst}</p>
        </div>
        <label className={s.switch}>
          <input type="checkbox" role="switch" checked={includeDraft} disabled={!usable} onChange={(e) => setIncludeDraft(e.target.checked)} aria-describedby="draft-hint" />
          <span>{copy.map.panel.draftSwitch}</span>
        </label>
        <p id="draft-hint" className={s.muted}>
          {copy.map.panel.draftHint}
        </p>
        {includeDraft && (
          <div className={s.draftLength} role="radiogroup" aria-label={copy.map.panel.draftLength}>
            {([300, 800] as const).map((n) => (
              <label key={n}>
                <input type="radio" name="draft-length" checked={draftLength === n} disabled={!usable} onChange={() => setDraftLength(n)} />
                <span>{n === 300 ? copy.map.panel.draftShort : copy.map.panel.draftLong}</span>
              </label>
            ))}
          </div>
        )}
        <Button variant="accent" block disabled={!usable || chosen.length === 0} loading={designing} title={reason ?? undefined} onClick={design}>
          {designing ? copy.map.panel.designing : result ? copy.map.panel.again : copy.map.panel.design}
        </Button>
        {isSample ? (
          <>
            <Button variant={chosen.length ? 'primary' : 'ghost'} block disabled={chosen.length === 0} onClick={() => setDemo(true)}>
              {copy.map.demo.button}
            </Button>
            {/* 예시 작품: 읽기 전용·체험·저장 안 됨을 한 줄로(로그인 안내와 겹치지 않게) */}
            <p className={s.muted}>{copy.map.panel.sampleNote}</p>
          </>
        ) : (
          <>
            {reason && <p className={s.muted}>{reason}</p>}
            <p className={s.muted}>{copy.map.panel.aiNoSave}</p>
          </>
        )}

        {shown && (
          <div className={`${s.panelBlock} ${s.resultBlock}`}>
            <h3 className={s.panelHead}>
              {copy.map.panel.resultTitle(shown.targetEp)} <Tag tone={isDemo ? 'neutral' : 'ai'}>{isDemo ? copy.map.demo.tag : copy.ai.suggestion}</Tag>
            </h3>
            <p className={s.pending} role="note">
              {isDemo ? copy.map.demo.note : copy.map.panel.pending}
            </p>
            <ol className={s.scenes}>
              {shown.scenes.map((sc) => (
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
            {shown.missing.length > 0 && <p className={s.muted}>{copy.map.panel.missing(shown.missing)}</p>}
            {shown.draft && (
              <div className={s.draft}>
                <h3 className={s.panelHead}>{copy.map.panel.draftTitle}</h3>
                <p>{shown.draft}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => copyResult(shown)}>
              {copy.map.panel.copyResult}
            </Button>
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
              <TextField label={copy.map.panel.chatLabel} hint={copy.map.panel.chatHint} placeholder={copy.map.panel.chatPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} disabled={chatting} maxLength={2000} />
              <Button type="submit" size="sm" disabled={chatting || !input.trim()}>
                {copy.map.panel.chatSend}
              </Button>
            </form>
          </div>
        ) : (
          usable && <p className={s.chatNote}>{copy.map.panel.chat}</p>
        )}
      </section>
    </Card>
  );
}
