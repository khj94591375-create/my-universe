import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { ConfirmBar } from '../../../components/ConfirmBar';
import { WriteButton } from '../../../components/WriteButton';
import { Tag } from '../../../components/Tag';
import { copy } from '../../../config/copy';
import { saveEpisodes, type BatchResult, type BatchRow } from '../../../features/analysis/runRules';
import { parseManuscript } from '../../../features/manuscript/parse';
import { ACCEPT, ManuscriptError, extractText } from '../../../features/manuscript/readFile';
import { useCanWrite, useWork } from '../../../features/works/useWork';
import { aiAnalyzeEpisodes, type AiAnalyzeResult } from '../../../features/ai/analyze';
import { useAiStatus } from '../../../features/ai/aiStatus';
import { showToast } from '../../../components/Toast';
import { refreshWorkData, useWorkData } from '../../../features/works/workData';
import s from './upload.module.css';

type Row = { key: string; fileName: string; no: string; title: string; body: string; guessed: boolean };
type FileError = { fileName: string; message: string };
let seq = 0;

const errorText = (e: unknown) => {
  if (e instanceof ManuscriptError) {
    if (e.reason === 'hwp') return copy.upload.errHwp;
    if (e.reason === 'unsupported') return copy.upload.errUnsupported;
    if (e.reason === 'empty') return copy.upload.errEmpty;
  }
  return copy.upload.errRead;
};

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
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [aiFailed, setAiFailed] = useState<AiAnalyzeResult[]>([]);
  const ai = useAiStatus();

  const existing = new Set(data?.episodes.map((e) => e.no) ?? []);

  const addFiles = async (files: File[]) => {
    setResults(null);
    const added: Row[] = [];
    const errs: FileError[] = [];
    // 번호를 못 찾은 회차는 이미 있는 회차·목록 다음 번호를 넣는다
    let next = Math.max(0, ...existing, ...rows.map((r) => Number(r.no) || 0)) + 1;
    for (const file of files) {
      setReading(file.name);
      try {
        const parsed = parseManuscript(file.name, await extractText(file));
        if (parsed.length === 0) throw new ManuscriptError('empty', 'empty');
        for (const p of parsed) {
          const no = p.no ?? next;
          next = Math.max(next, no + 1);
          added.push({ key: `r${++seq}`, fileName: file.name, no: String(no), title: p.title, body: p.body, guessed: p.no == null });
        }
      } catch (e) {
        errs.push({ fileName: file.name, message: errorText(e) });
      }
      // 큰 파일 여러 개를 읽어도 화면이 멈추지 않게
      await new Promise((r) => setTimeout(r, 0));
    }
    setReading(null);
    setRows((old) => [...old, ...added].sort((x, y) => Number(x.no) - Number(y.no)));
    setFileErrors((old) => [...old, ...errs]);
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
    const batch: BatchRow[] = list.map((r) => ({ key: r.key, no: Number(r.no), title: r.title, body: r.body, sourceFile: r.fileName }));
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
          <WriteButton workId={workId} onClick={() => inputRef.current?.click()} disabled={Boolean(reading || progress)}>
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
          <a className={s.sampleLink} href={`${import.meta.env.BASE_URL}samples/star-library-1-6.txt`} download="별의도서관_1-6화.txt">
            {copy.upload.sampleFile}
          </a>
        </div>

        {reading && <p className={s.muted} role="status">{copy.upload.reading(reading)}</p>}

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
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileErrors([]); setProblem(null); }} disabled={Boolean(progress)}>
                {copy.upload.clear}
              </Button>
            </div>
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
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <input className={s.noInput} type="number" min={1} value={r.no} aria-label={`${r.fileName} ${copy.upload.colNo}`} onChange={(e) => update(r.key, { no: e.target.value })} />
                      {existing.has(Number(r.no)) && <Tag tone="warn">{copy.upload.existsTag}</Tag>}
                      {r.guessed && <span className={s.guess} title={copy.upload.guessed}>?</span>}
                    </td>
                    <td>
                      <input className={s.titleInput} value={r.title} placeholder={`${r.no}화`} aria-label={`${r.fileName} ${copy.upload.colTitle}`} onChange={(e) => update(r.key, { title: e.target.value })} />
                    </td>
                    <td className={s.fileCell}>{r.fileName}</td>
                    <td className={s.num}>{r.body.replace(/\n/g, '').length.toLocaleString('ko-KR')}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => setRows((old) => old.filter((x) => x.key !== r.key))} disabled={Boolean(progress)}>
                        {copy.upload.removeRow}
                      </Button>
                    </td>
                  </tr>
                ))}
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
          <p className={s.progress} role="status" aria-live="polite">
            {aiProgress}
          </p>
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
          <div className={s.progress} role="status" aria-live="polite">
            <p>{copy.upload.progress(progress.done, progress.total, progress.no)}</p>
            <div className={s.bar}>
              <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
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
