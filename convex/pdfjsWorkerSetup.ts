/**
 * Node fake-worker wiring for pdfjs: pdfjs would otherwise dynamic-import
 * `./pdf.worker.mjs` relative to the bundled file, which does not exist in the
 * Convex bundle. Providing `globalThis.pdfjsWorker` makes pdfjs use this module
 * directly (`PDFWorker._setupFakeWorkerGlobal` checks it first).
 *
 * Import `./pdfjsPolyfill` first (it has no imports, so its body always runs
 * before this module's dependency chain), then this module, then pdf-parse.
 */
import "./pdfjsPolyfill";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

type UnknownRecord = Record<string, unknown>;
const g = globalThis as UnknownRecord;
g.pdfjsWorker = pdfjsWorker;
