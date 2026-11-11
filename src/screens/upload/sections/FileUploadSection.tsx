import { Fragment, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { WriteButton } from '../../../components/WriteButton';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import { limits } from '../../../config/limits';
import { art } from '../../../config/art';
import { ArtImage } from '../../../components/ArtImage';
import { saveEpisodes, type BatchResult, type BatchRow } from '../../../features/analysis/runRules';
import { cleanText, parseManuscript, scenesOf, splitByStarts, type ParsedEpisode } from '../../../features/manuscript/parse';
import { mergeRows, renumberFrom, splitRowAt } from '../../../features/manuscript/edit';
import { callAi, type SplitResult } from '../../../data/ai';
import { aiErrorMessage, refreshAiStatus, useAiStatus } from '../../../features/ai/aiStatus';
import { ACCEPT, ManuscriptError, extractText } from '../../../features/manuscript/readFile';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { aiAnalyzeEpisodes, type AiAnalyzeResult } from '../../../features/ai/analyze';
import { showToast } from '../../../components/Toast';
import { refreshWorkData, useWorkData } from '../../../features/works/workData';
import s from './upload.module.css';

/** sceneStarts: AI(또는 합치기·나누기)로 정한 장면 시작 줄(본문 줄 기준, 첫 장면 제외). 없으면 저장할 때 규칙으로 나눈다 */
type Row = { key: string; fileName: string; no: string; title: string; body: string; guessed: boolean; sceneStarts?: number[] };
type FileError = { fileName: string; message: string };
/** 파일마다 정리한 원고 글자와 지금 나눈 방식(AI로 다시 나누기·되돌리기용) */
type Source = { fileName: string; text: string; mode: 'rule' | 'ai'; ruleRows: Row[]; busy?: boolean; error?: string };
let seq = 0;
const MB = Math.round(limits.uploadMaxBytes / 1024 / 1024);

const errorText = (e: unknown) => {
  if (e instanceof ManuscriptError) {
    if (e.reason === 'hwp') return copy.upload.errHwp;
    if (e.reason === 'unsupported') return copy.upload.errUnsupported;
    if (e.reason === 'empty') return copy.upload.errEmpty;
  }
  return copy.upload.errRead;
};

/** 나눈 회차를 표 줄로. 번호가 없으면 next부터 */
function toRows(fileName: string, parsed: ParsedEpisode[], next: number): Row[] {
  let n = next;
  return parsed.map((p) => {
    const no = p.no ?? n;
    n = Math.max(n, no + 1);
    return { key: `r${++seq}`, fileName, no: String(no), title: p.title, body: p.body, guessed: p.no == null, ...(p.sceneStarts ? { sceneStarts: p.sceneStarts } : {}) };
  });
}

/** 파일 올리기: 글자 뽑기 → 회차 나누기·번호 찾기 → 미리보기(번호·제목 수정) → 저장하고 정리하기(BUILD_SPEC 6.4). */
export function FileUploadSection({ workId }: { workId: string }) {
  const nav = useNavigate();
  const { data } = useWorkData(workId);
  const { work } = useWork(workId);
  const canWrite = useCanWrite(work);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const [reading, setReading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirm, setConfirm] = useState<number[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; no: number } | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [limitNote, setLimitNote] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [aiFailed, setAiFailed] = useState<AiAnalyzeResult[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const ai = useAiStatus();

  const existing = new Set(data?.episodes.map((e) => e.no) ?? []);

  const addFiles = async (picked: File[]) => {
    setResults(null);
    const added: Row[] = [];
    const errs: FileError[] = [];
    const newSources: Source[] = [];
    // 한 번에 올릴 수 있는 파일 수 제한(목록에 이미 있는 파일 포함)
    const already = new Set(rows.map((r) => r.fileName)).size;
    const room = Math.max(0, limits.uploadMaxFiles - already);
    const files = picked.slice(0, room);
    if (picked.length > room) setLimitNote(copy.upload.errTooMany(limits.uploadMaxFiles, picked.length - room));
    else setLimitNote(null);
    // 번호를 못 찾은 회차는 이미 있는 회차·목록 다음 번호를 넣는다
    let next = Math.max(0, ...existing, ...rows.map((r) => Number(r.no) || 0)) + 1;
    for (const file of files) {
      setReading(file.name);
      if (file.size > limits.uploadMaxBytes) {
        errs.push({ fileName: file.name, message: copy.upload.errTooBig(MB) });
        continue;
      }
      try {
        const raw = await extractText(file);
        const parsed = parseManuscript(file.name, raw);
        if (parsed.length === 0) throw new ManuscriptError('empty', 'empty');
        const fileRows = toRows(file.name, parsed, next);
        next = Math.max(next, ...fileRows.map((r) => Number(r.no) + 1));
        added.push(...fileRows);
        newSources.push({ fileName: file.name, text: cleanText(raw), mode: 'rule', ruleRows: fileRows });
      } catch (e) {
        errs.push({ fileName: file.name, message: errorText(e) });
      }
      // 큰 파일 여러 개를 읽어도 화면이 멈추지 않게
      await new Promise((r) => setTimeout(r, 0));
    }
    setReading(null);
    setRows((old) => [...old, ...added].sort((x, y) => Number(x.no) - Number(y.no)));
    setFileErrors((old) => [...old, ...errs]);
    setSources((old) => [...old.filter((x) => !newSources.some((n) => n.fileName === x.fileName)), ...newSources]);
    // AI가 켜져 있으면 올리자마자 문맥으로 회차·장면을 나눈다(전송 안내는 올리기 칸 위에 늘 보임)
    if (canWrite && ai.on) for (const src of newSources) await aiSplit(src, true);
  };

  const patchSource = (fileName: string, patch: Partial<Source>) => setSources((old) => old.map((x) => (x.fileName === fileName ? { ...x, ...patch } : x)));
  const replaceFileRows = (fileName: string, list: Row[]) => setRows((old) => [...old.filter((r) => r.fileName !== fileName), ...list].sort((x, y) => Number(x.no) - Number(y.no)));

  /** AI로 문맥 보고 나누기: AI는 회차·장면 시작 줄만 고르고, 자르기는 여기서(원고 글자는 그대로). 실패하면 규칙 결과 그대로 */
  const aiSplit = async (src: Source, auto = false) => {
    if ([...src.text].length > 120_000) {
      patchSource(src.fileName, { error: copy.upload.splitTooLong });
      return;
    }
    patchSource(src.fileName, { busy: true, error: undefined });
    try {
      const r = await callAi<SplitResult>('split-episodes', { workId, text: src.text });
      const parsed = splitByStarts(src.text, r.starts);
      if (parsed.length === 0) throw new Error('empty');
      // 번호: AI가 읽은 번호가 늘어나기만 하면 그대로, 아니면 이 파일의 첫 번호부터 차례로
      const base = Math.min(...src.ruleRows.map((x) => Number(x.no)));
      const nums = parsed.map((p) => p.no);
      const ok = nums.every((n) => n != null) && nums.every((n, k) => k === 0 || n! > nums[k - 1]!);
      const start = Number.isFinite(base) ? base : Math.max(0, ...existing) + 1;
      const list = toRows(src.fileName, parsed.map((p, k) => ({ ...p, no: ok ? p.no : start + k })), start).map((x) => ({ ...x, guessed: !ok }));
      replaceFileRows(src.fileName, list);
      patchSource(src.fileName, { busy: false, mode: 'ai' });
    } catch (e) {
      const why = aiErrorMessage(e);
      patchSource(src.fileName, { busy: false, error: auto ? copy.upload.splitFallback(why) : why });
    }
    refreshAiStatus();
  };

  // 회차 합치기·나누기(원고 글자는 그대로, 자르는 위치만). 바꾼 뒤 그 파일의 번호를 차례로 다시 매긴다
  const [splitting, setSplitting] = useState<string | null>(null);
  const editFile = (fileName: string, fn: (list: Row[]) => Row[]) =>
    setRows((old) => {
      const mine = old.filter((r) => r.fileName === fileName).sort((x, y) => Number(x.no) - Number(y.no));
      const edited = renumberFrom(fn(mine), Number(mine[0]?.no) || 1).map((r) => ({ ...r, guessed: false }));
      return [...old.filter((r) => r.fileName !== fileName), ...edited].sort((x, y) => Number(x.no) - Number(y.no));
    });
  const mergeUp = (r: Row) => {
    editFile(r.fileName, (list) => mergeRows(list, r.key));
    showToast(copy.upload.renumbered);
  };
  const splitAt = (r: Row, line: number) => {
    editFile(r.fileName, (list) => splitRowAt(list, r.key, line, () => `r${++seq}`));
    setSplitting(null);
    showToast(copy.upload.renumbered);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canWrite) return;
    addFiles([...e.dataTransfer.files]);
  };

  const update = (key: string, patch: Partial<Row>) => setRows((old) => old.map((r) => (r.key === key ? { ...r, ...patch, guessed: patch.no ? false : r.guessed } : r)));

  const validate = (): string | null => {
    if (rows.length === 0) return copy.upload.nothing;
    const seen = new Set<number>();
    for (const r of rows) {
      const n = Number(r.no);
      if (!Number.isInteger(n) || n < 1) return copy.upload.badNo;
      if (seen.has(n)) return copy.upload.dupNo(n);
      seen.add(n);
    }
    return null;
  };

  const submit = () => {
    const err = validate();
    setProblem(err);
    if (err) return;
    const clash = rows.map((r) => Number(r.no)).filter((n) => existing.has(n));
    if (clash.length) return setConfirm(clash.sort((a, b) => a - b));
    run(rows, false);
  };

  const run = async (list: Row[], overwrite: boolean) => {
    if (!data || list.length === 0) return;
    setConfirm(null);
    const batch: BatchRow[] = list.map((r) => ({ key: r.key, no: Number(r.no), title: r.title, body: r.body, sourceFile: r.fileName, ...(r.sceneStarts ? { scenes: scenesOf(r.body, r.sceneStarts) } : {}) }));
    const res = await saveEpisodes(workId, batch, data.items, overwrite, (done, total, no) => setProgress({ done, total, no }));
    refreshWorkData(workId);
    setProgress(null);
    const okKeys = new Set(res.filter((r) => r.ok).map((r) => r.key));
    setRows((old) => old.filter((r) => !okKeys.has(r.key)));
    const merged = [...(results ?? []).filter((r) => !res.some((x) => x.key === r.key)), ...res];
    setResults(merged);
    // 규칙 정리 다음 AI 정리(켜져 있을 때만). 실패한 회차는 "AI 다시 정리"
    const saved = res.filter((r) => r.ok && r.episodeId).map((r) => ({ id: r.episodeId!, no: r.no }));
    let aiOk = true;
    if (saved.length && ai.on) {
      const aiRes = await runAi(saved);
      aiOk = aiRes.every((r) => r.ok);
    } else if (saved.length) {
      showToast(copy.ai.analyzeOff);
    }
    if (res.every((r) => r.ok) && aiOk) nav(`/w/${workId}/review?eps=${merged.filter((r) => r.ok).map((r) => r.no).sort((a, b) => a - b).join(',')}`);
  };

  const runAi = async (eps: { id: string; no: number }[]) => {
    const aiRes = await aiAnalyzeEpisodes(workId, eps, (done, total, no) => setAiProgress(copy.ai.analyzing(done, total, no)));
    setAiProgress(null);
    refreshWorkData(workId);
    setAiFailed((old) => [...old.filter((f) => !aiRes.some((r) => r.episodeId === f.episodeId)), ...aiRes.filter((r) => !r.ok)]);
    const found = aiRes.reduce((n, r) => n + r.found, 0);
    if (found) showToast(copy.ai.analyzed(found));
    return aiRes;
  };

  const failed = (results ?? []).filter((r) => !r.ok);
  const okNos = (results ?? []).filter((r) => r.ok).map((r) => r.no).sort((a, b) => a - b);

  return (
    <Card>
      <div className={s.fileWrap}>
        <div className={s.limits} id="upload-limits">
          <strong>{copy.upload.limitsTitle}</strong>
          <ul>
            {copy.upload.limits(MB, limits.uploadMaxFiles).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div
          className={dragOver ? `${s.drop} ${s.dropOn}` : s.drop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className={s.dropTitle}>{copy.upload.drop}</p>
          <WriteButton workId={workId} onClick={() => inputRef.current?.click()} disabled={Boolean(reading || progress)} aria-describedby="upload-limits">
            {copy.upload.pick}
          </WriteButton>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
          <p className={s.muted}>{copy.upload.dropHint}</p>
          {canWrite && ai.on && <p className={s.notice}>{copy.upload.autoSplitNotice}</p>}
          <a className={s.sampleLink} href={`${import.meta.env.BASE_URL}samples/star-library-1-6.txt`} download="별의도서관_1-6화.txt">
            {copy.upload.sampleFile}
          </a>
        </div>

        {reading && <p className={s.muted} role="status">{copy.upload.reading(reading)}</p>}
        {limitNote && <p className={s.error} role="alert">{limitNote}</p>}

        {fileErrors.length > 0 && (
          <ul className={s.errors} role="alert">
            {fileErrors.map((f, i) => (
              <li key={i}>
                <strong>{f.fileName}</strong> — {f.message}
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className={s.preview}>
            <div className={s.previewHead}>
              <h3>{copy.upload.previewTitle(rows.length)}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileErrors([]); setProblem(null); setSources([]); }} disabled={Boolean(progress)}>
                {copy.upload.clear}
              </Button>
            </div>
            {sources.length > 0 && (
              <div className={s.splitBox}>
                <strong>{copy.upload.splitTitle}</strong>
                <p className={s.muted}>{copy.upload.splitHint}</p>
                <ul className={s.splitList}>
                  {sources.map((src) => {
                    const n = rows.filter((r) => r.fileName === src.fileName).length;
                    return (
                      <li key={src.fileName}>
                        <span>{src.mode === 'ai' ? copy.upload.splitAi(src.fileName, n) : copy.upload.splitRule(src.fileName, n)}</span>
                        {canWrite && ai.on && (
                          <span className={s.splitActions}>
                            <Button size="sm" variant={src.mode === 'ai' ? 'ghost' : 'primary'} onClick={() => aiSplit(src)} loading={src.busy} disabled={Boolean(progress)}>
                              {src.busy ? copy.upload.splitRunning : copy.upload.splitRun}
                            </Button>
                            {src.mode === 'ai' && !src.busy && (
                              <Button size="sm" variant="ghost" onClick={() => { replaceFileRows(src.fileName, src.ruleRows); patchSource(src.fileName, { mode: 'rule' }); }} disabled={Boolean(progress)}>
                                {copy.upload.splitUndo}
                              </Button>
                            )}
                          </span>
                        )}
                        {src.error && <span className={s.error} role="alert">{src.error}</span>}
                      </li>
                    );
                  })}
                </ul>
                {canWrite && ai.on ? <p className={s.muted}>{copy.upload.splitNotice}</p> : canWrite && ai.reason ? <p className={s.muted}>{copy.upload.splitOff(ai.reason)}</p> : null}
              </div>
            )}
            <table className={s.table}>
              <thead>
                <tr>
                  <th>{copy.upload.colNo}</th>
                  <th>{copy.upload.colTitle}</th>
                  <th>{copy.upload.colFile}</th>
                  <th>{copy.upload.colChars}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const fileRows = rows.filter((x) => x.fileName === r.fileName);
                  const first = fileRows[0]?.key === r.key;
                  const lines = r.body.split('\n');
                  return (
                    <Fragment key={r.key}>
                      <tr>
                        <td>
                          <input className={s.noInput} type="number" min={1} value={r.no} aria-label={`${r.fileName} ${copy.upload.colNo}`} onChange={(e) => update(r.key, { no: e.target.value })} />
                          {existing.has(Number(r.no)) && <Tag tone="warn">{copy.upload.existsTag}</Tag>}
                          {r.guessed && <span className={s.guess} title={copy.upload.guessed}>?</span>}
                        </td>
                        <td>
                          <input className={s.titleInput} value={r.title} placeholder={`${r.no}화`} aria-label={`${r.fileName} ${copy.upload.colTitle}`} onChange={(e) => update(r.key, { title: e.target.value })} />
                        </td>
                        <td className={s.fileCell}>{r.fileName}</td>
                        <td className={s.num}>
                          {r.body.replace(/\n/g, '').length.toLocaleString('ko-KR')}
                          {r.sceneStarts && <span className={s.sceneCount}>{copy.upload.scenes(scenesOf(r.body, r.sceneStarts).length)}</span>}
                        </td>
                        <td className={s.rowBtns}>
                          {!first && (
                            <Button variant="ghost" size="sm" onClick={() => mergeUp(r)} disabled={Boolean(progress)} aria-label={`${r.no}화 ${copy.upload.mergeUp}`}>
                              {copy.upload.mergeUp}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setSplitting(splitting === r.key ? null : r.key)} disabled={Boolean(progress)} aria-expanded={splitting === r.key} aria-label={`${r.no}화 ${copy.upload.splitOpen}`}>
                            {splitting === r.key ? copy.upload.splitClose : copy.upload.splitOpen}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setRows((old) => old.filter((x) => x.key !== r.key))} disabled={Boolean(progress)}>
                            {copy.upload.removeRow}
                          </Button>
                        </td>
                      </tr>
                      {splitting === r.key && (
                        <tr>
                          <td colSpan={5}>
                            <p className={s.muted}>{copy.upload.splitPick}</p>
                            <ol className={s.lineList}>
                              {lines.map((l, i) =>
                                l.trim() ? (
                                  <li key={i}>
                                    {i > 0 && (
                                      <Button variant="ghost" size="sm" onClick={() => splitAt(r, i)}>
                                        {copy.upload.splitHere}
                                      </Button>
                                    )}
                                    <span>{l.length > 70 ? `${l.slice(0, 70)}…` : l}</span>
                                  </li>
                                ) : null,
                              )}
                            </ol>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {rows.some((r) => r.guessed) && <p className={s.muted}>? {copy.upload.guessed}</p>}
            {problem && <p className={s.error} role="alert">{problem}</p>}
            {confirm ? (
              <ConfirmBar
                message={copy.upload.existsMany(confirm)}
                confirmLabel={copy.upload.overwrite}
                cancelLabel={copy.upload.skipExisting}
                onConfirm={() => run(rows, true)}
                onCancel={() => run(rows.filter((r) => !existing.has(Number(r.no))), false)}
              />
            ) : (
              <div className={s.actions}>
                <WriteButton workId={workId} variant="accent" onClick={submit} loading={Boolean(progress)}>
                  {copy.upload.submit}
                </WriteButton>
              </div>
            )}
          </div>
        )}

        {aiProgress && (
          <div className={s.waiting}>
            <ArtImage art={art.loading} className={s.waitingArt} />
            <p className={s.progress} role="status" aria-live="polite">
              {aiProgress}
            </p>
          </div>
        )}

        {aiFailed.length > 0 && !aiProgress && (
          <div className={s.failed} role="alert">
            <h3>{copy.ai.analyzeFailed}</h3>
            <ul>
              {aiFailed.map((f) => (
                <li key={f.episodeId}>
                  <span>
                    <strong>{f.no}화</strong> — {f.error}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => runAi([{ id: f.episodeId, no: f.no }])}>
                    {copy.ai.analyzeRetry}
                  </Button>
                </li>
              ))}
            </ul>
            {okNos.length > 0 && <Button onClick={() => nav(`/w/${workId}/review?eps=${okNos.join(',')}`)}>{copy.upload.toReview}</Button>}
          </div>
        )}

        {progress && (
          <div className={s.waiting}>
            <ArtImage art={art.loading} className={s.waitingArt} />
            <div className={s.progress} role="status" aria-live="polite">
              <p>{copy.upload.progress(progress.done, progress.total, progress.no)}</p>
              <div className={s.bar}>
                <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        {failed.length > 0 && !progress && (
          <div className={s.failed} role="alert">
            <h3>{copy.upload.failedTitle}</h3>
            <ul>
              {failed.map((f) => {
                const row = rows.find((r) => r.key === f.key);
                return (
                  <li key={f.key}>
                    <span>
                      <strong>{f.no}화</strong> — {f.error}
                    </span>
                    {row && (
                      <Button size="sm" variant="ghost" onClick={() => run([row], true)}>
                        {copy.upload.retry}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            {okNos.length > 0 && (
              <Button onClick={() => nav(`/w/${workId}/review?eps=${okNos.join(',')}`)}>{copy.upload.toReview}</Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
