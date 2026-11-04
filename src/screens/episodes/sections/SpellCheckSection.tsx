import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { Tag } from '../../../components/Tag';
import { showToast } from '../../../components/Toast';
import { copy } from '../../../config/copy';
import { AiCallError, callAi } from '../../../data/ai';
import { updateEpisodeBody } from '../../../data/episodes';
import { toMessage } from '../../../data/errors';
import { addStyleTerm, listStyleTerms, removeStyleTerm, type StyleTerm } from '../../../data/styleTerms';
import type { Episode } from '../../../data/types';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { reanalyzeEpisode } from '../../../features/analysis/runRules';
import { ruleSuggestions } from '../../../features/spell/rules';
import { applyAccepted, countByType, locateAi, mergeSuggestions, splitForCheck, type TextPart } from '../../../features/spell/text';
import type { AiSpell, Decision, Suggestion } from '../../../features/spell/types';
import { save } from '../../../features/works/save';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { useWorkData } from '../../../features/works/workData';
import s from './spell.module.css';

/** AI 검사를 더 이어 갈 수 없는 오류(남은 묶음도 멈춘다) */
const STOP_CODES = new Set(['limit', 'ai_off', 'not_deployed', 'login', 'forbidden', 'sample']);
const TYPES = ['spelling', 'spacing', 'typo', 'punctuation', 'style'] as const;

/**
 * 맞춤법 검사(작가의 문체를 존중하는 검토 도구).
 * - 결과는 이 화면(브라우저)에만 두고 원고와 따로 관리한다.
 * - "수정 적용"을 고른 제안만 교정본에 들어가고, 원고에 반영은 작가가 확인한 뒤에만 한다.
 * - 설정집·우주 지도에는 아무것도 자동으로 더하지 않는다.
 */
export function SpellCheckSection({ workId, episode, onClose }: { workId: string; episode: Episode; onClose: () => void }) {
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const ai = useAiStatus();
  const useAi = canWrite && ai.on;
  const body = episode.body;

  const [dict, setDict] = useState<{ ready: boolean; terms: StyleTerm[] }>({ ready: false, terms: [] });
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [list, setList] = useState<Suggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<TextPart[]>([]);
  const [stopMsg, setStopMsg] = useState<string | null>(null);
  const [view, setView] = useState<'review' | 'text' | 'compare'>('review');
  const [confirming, setConfirming] = useState(false);
  const [reanalyze, setReanalyze] = useState(true);
  const [busy, setBusy] = useState(false);
  const aiByPart = useRef(new Map<number, Suggestion[]>());

  useEffect(() => {
    listStyleTerms(workId).then(setDict, () => setDict({ ready: false, terms: [] }));
  }, [workId]);

  // 기본 규칙 결과는 원고가 같으면 한 번만(다시 검사해도 결정이 유지되게)
  const rules = useMemo(() => ruleSuggestions(body), [body]);
  const protect = useMemo(() => (data ? data.items.flatMap((i) => [i.name, ...i.aliases]) : []), [data]);
  if (!data) return null;

  const run = async (only?: TextPart[]) => {
    setPhase('running');
    setStopMsg(null);
    setConfirming(false);
    const parts = only ?? splitForCheck(body);
    if (!only) {
      aiByPart.current = new Map();
      setDecisions({});
      setIdx(0);
    }
    const missed: TextPart[] = [];
    if (useAi) {
      for (let i = 0; i < parts.length; i++) {
        setProgress({ done: i, total: parts.length });
        try {
          const r = await callAi<{ suggestions: AiSpell[] }>('spell-check', { workId, text: parts[i].text });
          aiByPart.current.set(parts[i].start, locateAi(parts[i], r.suggestions, body));
        } catch (e) {
          missed.push(parts[i]);
          if (e instanceof AiCallError && STOP_CODES.has(e.code)) {
            setStopMsg(aiErrorMessage(e));
            missed.push(...parts.slice(i + 1));
            break;
          }
        }
      }
      refreshAiStatus();
    }
    setFailed(missed);
    setProgress(null);
    setList(mergeSuggestions(body, [...aiByPart.current.values(), rules], protect, dict.terms.map((t) => t.term)));
    setPhase('done');
  };

  const counts = countByType(list);
  const decidedN = list.filter((x) => decisions[x.id]).length;
  const appliedN = list.filter((x) => decisions[x.id] === 'apply').length;
  const cur = list[Math.min(idx, list.length - 1)];
  const corrected = applyAccepted(body, list, decisions);

  // 결정 후 다음 미결정 제안으로
  const decide = (sg: Suggestion, d: Decision, extra: Record<string, Decision> = {}) => {
    const next = { ...decisions, ...extra, [sg.id]: d };
    setDecisions(next);
    const after = list.findIndex((x, i) => i > idx && !next[x.id]);
    const anyLeft = list.findIndex((x) => !next[x.id]);
    setIdx(after >= 0 ? after : anyLeft >= 0 ? anyLeft : idx);
  };

  const always = async (sg: Suggestion) => {
    try {
      await addStyleTerm(workId, sg.original);
      setDict((d) => ({ ...d, terms: [...d.terms.filter((t) => t.term !== sg.original), { id: `local-${sg.original}`, work_id: workId, term: sg.original, note: null, created_at: '' }] }));
      // 같은 표현의 다른 제안도 원문 유지로
      const same: Record<string, Decision> = {};
      for (const x of list) if (x.original === sg.original && x.id !== sg.id) same[x.id] = 'keep';
      decide(sg, 'always', same);
      showToast(copy.spell.alwaysAdded(sg.original));
      listStyleTerms(workId).then(setDict, () => undefined);
    } catch (e) {
      showToast(`${copy.toast.failed} (${toMessage(e)})`, 'error');
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(corrected);
      showToast(copy.spell.copied);
    } catch {
      showToast(copy.spell.copyFail, 'error');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([corrected], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${episode.no}화-교정본.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const applyToManuscript = async () => {
    setBusy(true);
    const n = appliedN;
    const ok = await save(
      workId,
      async () => {
        await updateEpisodeBody(episode.id, corrected);
        if (reanalyze) await reanalyzeEpisode({ ...episode, body: corrected }, data.items);
      },
      copy.spell.applied(n),
    );
    setBusy(false);
    if (ok) {
      setConfirming(false);
      setPhase('idle');
      setList([]);
      setDecisions({});
    }
  };

  /** 원고를 제안 위치로 잘라 표시용 조각으로 */
  const pieces = (text: string, mode: 'before' | 'after') => {
    const out: { key: string; text: string; sg?: Suggestion }[] = [];
    let at = 0;
    for (const sg of list) {
      if (sg.start < at) continue;
      out.push({ key: `t${at}`, text: text.slice(at, sg.start) });
      const shown = mode === 'after' && decisions[sg.id] === 'apply' ? sg.suggestion : sg.original;
      out.push({ key: sg.id, text: shown, sg });
      at = sg.end;
    }
    out.push({ key: `t${at}`, text: text.slice(at) });
    return out;
  };
  const markClass = (sg: Suggestion) => {
    const d = decisions[sg.id];
    return [s.mark, d === 'apply' ? s.markApplied : d ? s.markKept : sg.certainty === 'check' ? s.markCheck : '', sg === cur ? s.markCurrent : ''].join(' ');
  };
  const context = (sg: Suggestion) => ({ before: body.slice(Math.max(0, sg.start - 30), sg.start), after: body.slice(sg.end, sg.end + 30) });

  return (
    <section className={s.panel} aria-labelledby="spell-title">
      <div className={s.head}>
        <h3 id="spell-title">{copy.spell.title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {copy.spell.close}
        </Button>
      </div>
      <p className={s.muted}>{copy.spell.lead}</p>
      {!canWrite ? (
        <p className={s.note}>{copy.spell.sampleRuleOnly}</p>
      ) : useAi ? (
        <p className={s.note}>{copy.spell.aiNotice}</p>
      ) : (
        <p className={s.note}>{copy.spell.ruleOnly(ai.reason ?? '')}</p>
      )}

      <div className={s.row}>
        <Button onClick={() => run()} loading={phase === 'running'} variant={phase === 'done' ? 'ghost' : 'primary'}>
          {phase === 'done' ? copy.spell.again : copy.spell.start}
        </Button>
        {phase === 'done' && failed.length > 0 && useAi && (
          <Button variant="ghost" onClick={() => run(failed)}>
            {copy.spell.retryFailed}
          </Button>
        )}
      </div>
      {progress && (
        <p className={s.muted} role="status" aria-live="polite">
          {copy.spell.running(progress.done, progress.total)}
        </p>
      )}
      {stopMsg && <p className={s.warn} role="alert">{copy.spell.stopped(stopMsg)}</p>}
      {phase === 'done' && failed.length > 0 && <p className={s.warn}>{copy.spell.failedParts(failed.length)}</p>}

      {phase === 'done' && list.length === 0 && (
        <div className={s.empty} role="status">
          <strong>{copy.spell.none}</strong>
          <p className={s.muted}>{copy.spell.noneHint}</p>
        </div>
      )}

      {phase === 'done' && list.length > 0 && cur && (
        <>
          {/* 요약: 전체·유형별·확인 필요·결정 수 */}
          <div className={s.summary} role="status">
            <strong>{copy.spell.total(list.length)}</strong>
            {TYPES.filter((t) => counts[t]).map((t) => (
              <Tag key={t} tone={t === 'style' ? 'ai' : 'neutral'}>
                {copy.spell.types[t]} {counts[t]}
              </Tag>
            ))}
            {list.some((x) => x.certainty === 'check') && <Tag tone="warn">{copy.spell.check(list.filter((x) => x.certainty === 'check').length)}</Tag>}
            <span className={s.muted}>{copy.spell.decided(decidedN, list.length)}</span>
          </div>

          <div className={s.tabs} role="tablist" aria-label={copy.spell.title}>
            {(['review', 'text', 'compare'] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? `${s.tab} ${s.tabOn}` : s.tab} onClick={() => setView(v)}>
                {v === 'review' ? copy.spell.viewReview : v === 'text' ? copy.spell.viewText : copy.spell.viewCompare}
              </button>
            ))}
          </div>

          {view === 'review' && (
            <div className={s.card} aria-live="polite">
              <div className={s.cardHead}>
                <span className={s.pos}>{copy.spell.position(list.indexOf(cur) + 1, list.length)}</span>
                <Tag tone={cur.type === 'style' ? 'ai' : 'neutral'}>{copy.spell.types[cur.type]}</Tag>
                {cur.certainty === 'check' && <Tag tone="warn">{copy.spell.certaintyCheck}</Tag>}
                {cur.inDialogue && <Tag>{copy.spell.inDialogue}</Tag>}
                <span className={s.muted}>{cur.source === 'ai' ? copy.spell.sourceAi : copy.spell.sourceRule}</span>
                {decisions[cur.id] && <Tag tone="ok">{copy.spell.decisionLabel[decisions[cur.id] as string]}</Tag>}
              </div>
              <p className={s.context}>
                …{context(cur).before}
                <mark className={s.markCurrent}>{cur.original}</mark>
                {context(cur).after}…
              </p>
              <dl className={s.diff}>
                <div>
                  <dt>{copy.spell.from}</dt>
                  <dd className={s.del}>{cur.original}</dd>
                </div>
                <div>
                  <dt>{copy.spell.to}</dt>
                  <dd className={s.ins}>{cur.suggestion}</dd>
                </div>
                <div>
                  <dt>{copy.spell.reason}</dt>
                  <dd>{cur.reason}</dd>
                </div>
              </dl>
              {cur.type === 'style' && <p className={s.muted}>{copy.spell.styleNote}</p>}
              <div className={s.row}>
                <Button size="sm" onClick={() => decide(cur, 'apply')} aria-pressed={decisions[cur.id] === 'apply'}>
                  {copy.spell.apply}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => decide(cur, 'keep')} aria-pressed={decisions[cur.id] === 'keep'}>
                  {copy.spell.keep}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canWrite || !dict.ready}
                  title={!canWrite ? copy.spell.loginOff : !dict.ready ? copy.spell.alwaysOff : undefined}
                  onClick={() => always(cur)}
                  aria-pressed={decisions[cur.id] === 'always'}
                >
                  {copy.spell.always}
                </Button>
              </div>
              {canWrite && !dict.ready && <p className={s.muted}>{copy.spell.alwaysOff}</p>}
              <div className={s.row}>
                <Button size="sm" variant="ghost" disabled={list.indexOf(cur) <= 0} onClick={() => setIdx(list.indexOf(cur) - 1)}>
                  ← {copy.spell.prev}
                </Button>
                <Button size="sm" variant="ghost" disabled={list.indexOf(cur) >= list.length - 1} onClick={() => setIdx(list.indexOf(cur) + 1)}>
                  {copy.spell.next} →
                </Button>
              </div>
            </div>
          )}

          {view === 'text' && (
            <div className={s.text}>
              {pieces(body, 'before').map((p) =>
                p.sg ? (
                  <button
                    key={p.key}
                    type="button"
                    className={markClass(p.sg)}
                    title={`${copy.spell.types[p.sg.type]}: ${p.sg.original} → ${p.sg.suggestion}`}
                    onClick={() => {
                      setIdx(list.indexOf(p.sg as Suggestion));
                      setView('review');
                    }}
                  >
                    {p.text}
                  </button>
                ) : (
                  <span key={p.key}>{p.text}</span>
                ),
              )}
            </div>
          )}

          {view === 'compare' && (
            <div className={s.compare}>
              <div>
                <h4>{copy.spell.before}</h4>
                <div className={s.text}>
                  {pieces(body, 'before').map((p) =>
                    p.sg && decisions[p.sg.id] === 'apply' ? (
                      <del key={p.key} className={s.del}>
                        {p.text}
                      </del>
                    ) : (
                      <span key={p.key}>{p.text}</span>
                    ),
                  )}
                </div>
              </div>
              <div>
                <h4>{copy.spell.after(appliedN)}</h4>
                <div className={s.text}>
                  {pieces(body, 'after').map((p) =>
                    p.sg && decisions[p.sg.id] === 'apply' ? (
                      <ins key={p.key} className={s.ins}>
                        {p.text}
                      </ins>
                    ) : (
                      <span key={p.key}>{p.text}</span>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 교정본: 복사·내려받기는 원고를 안 바꾼다. 반영은 확인 후에만 */}
          <div className={s.row}>
            <Button variant="ghost" size="sm" onClick={copyResult}>
              {copy.spell.copyResult}
            </Button>
            <Button variant="ghost" size="sm" onClick={download}>
              {copy.spell.download}
            </Button>
            {canWrite && (
              <Button size="sm" variant="accent" disabled={appliedN === 0} title={appliedN === 0 ? copy.spell.applyNeed : undefined} onClick={() => setConfirming(true)}>
                {copy.spell.applyToManuscript}
              </Button>
            )}
          </div>
          {confirming && (
            <div className={s.confirm} role="alertdialog" aria-labelledby="spell-confirm">
              <p id="spell-confirm">{copy.spell.confirm(appliedN)}</p>
              <label className={s.check}>
                <input type="checkbox" checked={reanalyze} onChange={(e) => setReanalyze(e.target.checked)} />
                {copy.spell.reanalyze}
              </label>
              <p className={s.muted}>{copy.spell.reanalyzeNote}</p>
              <div className={s.row}>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                  {copy.spell.cancel}
                </Button>
                <Button size="sm" variant="danger" onClick={applyToManuscript} loading={busy}>
                  {copy.spell.confirmYes}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {dict.ready && (
        <details className={s.dict}>
          <summary>{copy.spell.dict(dict.terms.length)}</summary>
          {dict.terms.length === 0 ? (
            <p className={s.muted}>{copy.spell.dictEmpty}</p>
          ) : (
            <ul>
              {dict.terms.map((t) => (
                <li key={t.id}>
                  <span>{t.term}</span>
                  {canWrite && !t.id.startsWith('local-') && (
                    <button
                      type="button"
                      className={s.remove}
                      aria-label={copy.spell.dictRemove(t.term)}
                      onClick={async () => {
                        try {
                          await removeStyleTerm(t.id);
                          setDict((d) => ({ ...d, terms: d.terms.filter((x) => x.id !== t.id) }));
                        } catch (e) {
                          showToast(`${copy.toast.failed} (${toMessage(e)})`, 'error');
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </section>
  );
}
