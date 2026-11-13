import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

let sharedWorker: pdfjsLib.PDFWorker | null = null;

/**
 * Returns a stable, persistent PDFWorker instance.
 * Passing this worker explicitly to `pdfjsLib.getDocument({ worker })` prevents
 * `loadingTask.destroy()` from terminating the web worker thread during document
 * switching or component unmount.
 */
export function getSharedPdfWorker(): pdfjsLib.PDFWorker {
  if (!sharedWorker || (sharedWorker as any).destroyed) {
    sharedWorker = new pdfjsLib.PDFWorker();
  }
  return sharedWorker;
}

export { pdfjsLib };
