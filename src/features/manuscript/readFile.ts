import { extOf } from './parse';

/*
 * 브라우저에서 원고 파일의 글자만 뽑는다(BUILD_SPEC 7.5). 파일은 서버로 보내지 않는다.
 * 큰 라이브러리(mammoth, pdfjs)는 필요할 때만 불러온다.
 */

export class ManuscriptError extends Error {
  constructor(public reason: 'hwp' | 'unsupported' | 'empty' | 'read', message: string) {
    super(message);
  }
}

export const ACCEPT = '.docx,.pdf,.txt,.hwp,.hwpx';

export async function extractText(file: File): Promise<string> {
  const ext = extOf(file.name);
  if (ext === 'hwp' || ext === 'hwpx') throw new ManuscriptError('hwp', 'hwp');
  let text: string;
  try {
    if (ext === 'txt') text = await readTxt(file);
    else if (ext === 'docx') text = await readDocx(file);
    else if (ext === 'pdf') text = await readPdf(file);
    else throw new ManuscriptError('unsupported', ext);
  } catch (e) {
    if (e instanceof ManuscriptError) throw e;
    throw new ManuscriptError('read', e instanceof Error ? e.message : String(e));
  }
  if (!text.trim()) throw new ManuscriptError('empty', 'empty');
  return text;
}

/** txt: UTF-8로 읽고, 깨지면 EUC-KR(옛 한글 메모장 형식)로 다시 읽는다. */
async function readTxt(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('euc-kr').decode(buf);
  }
}

async function readDocx(file: File): Promise<string> {
  const mod = await import('mammoth/mammoth.browser.min.js');
  const mammoth = (mod.default ?? mod) as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // 글자 조각을 이어 붙이고, 줄이 바뀐 곳(hasEOL)에는 줄바꿈을 넣는다
    let line = '';
    for (const it of content.items) {
      if (!('str' in it)) continue;
      line += it.str;
      if (it.hasEOL) line += '\n';
    }
    pages.push(line);
  }
  await task.destroy();
  return pages.join('\n');
}
