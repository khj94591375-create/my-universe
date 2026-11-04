import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Loading } from '../../components/Loading';
import { KindTag } from '../../components/Badges';
import { Tag } from '../../components/Tag';
import { SelectField, TextArea } from '../../components/TextField';
import { showToast } from '../../components/Toast';
import { copy } from '../../config/copy';
import { usePageTitle } from '../../lib/usePageTitle';
import { fetchWorkRaw } from '../../data/workData';
import { getSampleWork, listMyWorks } from '../../data/works';
import { toMessage } from '../../data/errors';
import type { Work } from '../../data/types';
import { useSession } from '../../features/auth/SessionProvider';
import { deriveWorkData, type WorkData } from '../../features/works/workData';
import { parseGold } from '../../features/eval/gold';
import { norm, scoreEval, type Candidate, type EvalResult } from '../../features/eval/score';
import s from './eval.module.css';

/** 작품 데이터에서 채점 후보(항목 + 연결된 항목 id)를 만든다. */
function candidatesOf(data: WorkData, aiOnly: boolean): Candidate[] {
  return data.items
    .filter((i) => !aiOnly || i.source === 'ai')
    .map((i) => ({
      id: i.id,
      kind: i.kind,
      name: i.name,
      aliases: i.aliases,
      first_ep: i.first_ep,
      last_ep: i.last_ep,
      status: i.status,
      related: data.links.filter((l) => l.a === i.id || l.b === i.id).map((l) => (l.a === i.id ? l.b : l.a)),
    }));
}

/** AI가 낸 근거 문장 중 원고에 글자 그대로 있는 비율(8.3 검증이 잘 되는지 확인용). */
function evidencePass(data: WorkData) {
  const body = new Map(data.episodes.map((e) => [e.id, norm(e.body)]));
  const ai = data.appearances.filter((a) => a.source === 'ai');
  return { n: ai.length, ok: ai.filter((a) => (body.get(a.episode_id) ?? '').includes(norm(a.evidence))).length };
}

/** AI 정확도 채점(BUILD_SPEC 12장, 관리자용 /#/eval). */
export default function EvalScreen() {
  usePageTitle(copy.eval.title);
  const { session } = useSession();
  const [works, setWorks] = useState<Work[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workId, setWorkId] = useState('');
  const [data, setData] = useState<WorkData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [goldText, setGoldText] = useState('');
  const [aiOnly, setAiOnly] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMyWorks(session?.user.id ?? ''), getSampleWork()]).then(
      ([mine, sample]) => setWorks([...mine, ...(sample ? [sample] : [])]),
      (e) => setError(toMessage(e)),
    );
  }, [session?.user.id]);

  useEffect(() => {
    setData(null);
    setResult(null);
    if (!workId) return;
    setLoadingData(true);
    fetchWorkRaw(workId).then(
      (raw) => {
        const d = deriveWorkData(raw);
        setData(d);
        setAiOnly(d.items.some((i) => i.source === 'ai'));
        setLoadingData(false);
      },
      (e) => {
        setError(toMessage(e));
        setLoadingData(false);
      },
    );
  }, [workId]);

  const gold = useMemo(() => (goldText.trim() ? parseGold(goldText) : null), [goldText]);
  const aiCount = data ? data.items.filter((i) => i.source === 'ai').length : 0;

  const run = () => {
    setProblem(null);
    if (!data) return setProblem(copy.eval.needWork);
    if (!gold || gold.items.length === 0) return setProblem(copy.eval.needGold);
    setResult(scoreEval(gold.items, candidatesOf(data, aiOnly)));
  };

  const copyTable = async () => {
    if (!result) return;
    const lines = [['구분', '정답 이름', '결과 이름', '정답 종류', '결과 종류', '회차 맞음'].join('\t')];
    for (const m of result.matched) lines.push(['맞음', m.gold.name, m.cand.name, m.gold.kind, m.cand.kind, m.epOk == null ? '' : m.epOk ? 'O' : 'X'].join('\t'));
    for (const g of result.missed) lines.push(['놓침', g.name, '', g.kind, '', ''].join('\t'));
    for (const c of result.wrong) lines.push(['엉뚱하게 찾음', '', c.name, '', c.kind, ''].join('\t'));
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast(copy.eval.copied);
    } catch {
      showToast(copy.eval.copyFailed, 'error');
    }
  };

  if (error) return <div className={s.page}><ErrorState body={error} /></div>;
  if (!works) return <div className={s.page}><Loading /></div>;
  const ev = data ? evidencePass(data) : { n: 0, ok: 0 };

  return (
    <main className={s.page}>
      <h1 className={s.title}>{copy.eval.title}</h1>
      <p className={s.lead}>{copy.eval.lead}</p>

      <Card>
        <div className={s.form}>
          <SelectField
            label={copy.eval.work}
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            options={[['', copy.eval.workPick], ...works.map((w) => [w.id, w.is_sample ? `${w.title} (${copy.works.sampleSection})` : w.title] as [string, string])]}
          />
          {loadingData && <Loading />}
          {data && (
            <fieldset className={s.scope}>
              <legend>{copy.eval.scope}</legend>
              <label>
                <input type="radio" name="scope" checked={!aiOnly} onChange={() => setAiOnly(false)} /> {copy.eval.scopeAll(data.items.length)}
              </label>
              <label>
                <input type="radio" name="scope" checked={aiOnly} disabled={aiCount === 0} onChange={() => setAiOnly(true)} /> {copy.eval.scopeAi(aiCount)}
              </label>
            </fieldset>
          )}
          <div className={s.goldHead}>
            <strong>{copy.eval.gold}</strong>
            <label className={s.fileBtn}>
              {copy.eval.goldFile}
              <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setGoldText(await f.text()); e.target.value = ''; }} />
            </label>
            <a href={`${import.meta.env.BASE_URL}samples/star-library-gold.csv`} download="별의도서관_정답.csv" className={s.sample}>
              {copy.eval.goldSample}
            </a>
          </div>
          <TextArea label={copy.eval.goldPaste} value={goldText} onChange={(e) => setGoldText(e.target.value)} rows={6} placeholder="kind,name,aliases,first_ep,last_ep,status,related,resolved_ep" />
          <p className={s.muted}>{copy.eval.goldFormat}</p>
          {gold && gold.items.length > 0 && <p className={s.muted}>{copy.eval.goldCount(gold.items.length)}</p>}
          {gold && gold.errors.length > 0 && (
            <ul className={s.errors} role="alert">
              {gold.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {problem && <p className={s.error} role="alert">{problem}</p>}
          <div className={s.actions}>
            <Button variant="accent" onClick={run}>{copy.eval.run}</Button>
          </div>
        </div>
      </Card>

      {result && (
        <>
          <div className={s.big}>
            <Card tone="highlight">
              <p className={s.bigLabel}>{copy.eval.recallTitle}</p>
              <p className={s.bigNum}>{copy.eval.pct(result.total.recall)}</p>
              <p>{copy.eval.recallText(result.total.matched, result.total.gold)}</p>
            </Card>
            <Card tone="highlight">
              <p className={s.bigLabel}>{copy.eval.precisionTitle}</p>
              <p className={s.bigNum}>{copy.eval.pct(result.total.precision)}</p>
              <p>{copy.eval.precisionText(result.total.matched, result.total.found)}</p>
            </Card>
          </div>

          <Card title={copy.eval.byKind}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>{copy.eval.colKind}</th><th>{copy.eval.colGold}</th><th>{copy.eval.colFound}</th><th>{copy.eval.colMatched}</th>
                  <th>{copy.eval.recallTitle}</th><th>{copy.eval.precisionTitle}</th>
                </tr>
              </thead>
              <tbody>
                {(['character', 'setting', 'foreshadow'] as const).map((k) => {
                  const r = result.byKind[k];
                  return (
                    <tr key={k}>
                      <td><KindTag kind={k} /></td><td>{r.gold}</td><td>{r.found}</td><td>{r.matched}</td>
                      <td>{copy.eval.pct(r.recall)}</td><td>{copy.eval.pct(r.precision)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card title={copy.eval.extra}>
            <ul className={s.extra}>
              <li>{copy.eval.epAcc(result.epAccuracy.correct, result.epAccuracy.checked)} ({copy.eval.pct(result.epAccuracy.rate)})</li>
              <li>{copy.eval.resolveAcc(result.resolveAccuracy.correct, result.resolveAccuracy.checked)} ({copy.eval.pct(result.resolveAccuracy.rate)})</li>
              <li>{copy.eval.relation(result.relationRecall.found, result.relationRecall.checked)} ({copy.eval.pct(result.relationRecall.rate)})</li>
              {ev.n > 0 && <li>{copy.eval.evidence(ev.ok, ev.n)} ({copy.eval.pct(ev.ok / ev.n)})</li>}
            </ul>
          </Card>

          <div className={s.lists}>
            <Card title={copy.eval.matchedTitle(result.matched.length)}>
              <ul className={s.list}>
                {result.matched.map((m) => (
                  <li key={m.gold.row}>
                    <strong>{m.gold.name}</strong> ↔ {m.cand.name} <KindTag kind={m.cand.kind} />
                    {!m.kindOk && <Tag tone="warn">{copy.eval.kindWrong}</Tag>}
                    {m.epOk === false && <Tag tone="warn">{copy.eval.epWrong}</Tag>}
                    {m.how === 'contains' && <Tag>{copy.eval.viaContains}</Tag>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={copy.eval.missedTitle(result.missed.length)}>
              <ul className={s.list}>
                {result.missed.map((g) => (
                  <li key={g.row}><strong>{g.name}</strong> <KindTag kind={g.kind} /></li>
                ))}
              </ul>
            </Card>
            <Card title={copy.eval.wrongTitle(result.wrong.length)}>
              <ul className={s.list}>
                {result.wrong.map((c) => (
                  <li key={c.id}><strong>{c.name}</strong> <KindTag kind={c.kind} /></li>
                ))}
              </ul>
            </Card>
          </div>
          <div className={s.actions}>
            <Button variant="ghost" onClick={copyTable}>{copy.eval.copyTable}</Button>
          </div>
        </>
      )}
      <Link to="/settings">{copy.settings.title}</Link>
    </main>
  );
}
