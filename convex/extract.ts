"use node";

/**
 * Server-side text extraction for stored documents. Runs inside node actions;
 * every extractor returns "units" that carry their provenance number — a PDF
 * page number or a PowerPoint slide number — which later becomes the chunk's
 * `page` field so AI answers can cite "Page 28" or "Slide 5".
 */
// Import order is load-bearing: globals → worker wiring → pdfjs.
import "./pdfjsPolyfill";
import "./pdfjsWorkerSetup";
import { unzipSync } from "fflate";
import { PDFParse } from "pdf-parse";
import type { FileKind } from "./validators";

/** One provenance-bearing text unit: a PDF page or a PPT/PPTX slide. */
export interface ExtractedUnit {
  num: number;
  text: string;
}

// ---------------------------------------------------------------------------
// PDF — pdfjs via pdf-parse (proven against the 131-page MSE guide in Convex).
// ---------------------------------------------------------------------------

export async function extractPdfPages(bytes: Uint8Array): Promise<ExtractedUnit[]> {
  const parser = new PDFParse(bytes);
  const result = await parser.getText();
  const pages = result.pages ?? [];
  return pages
    .map((p: { num: number; text: string }) => {
      const text = (p.text ?? "").trim();
      return {
        num: p.num,
        text: text.length > 0 ? text : `Page ${p.num}: [Visual diagram / illustration page]`,
      };
    })
    .filter((p: ExtractedUnit) => p.text.trim().length > 0);
}

// ---------------------------------------------------------------------------
// PPTX — a ZIP of XML. Slide text lives in ppt/slides/slideN.xml as <a:t> runs.
// ---------------------------------------------------------------------------

/** Pull readable text out of one DrawingML slide/notes XML document. */
function textFromSlideXml(xml: string): string {
  const paragraphs = xml.split("</a:p>");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const runs = paragraph.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
    if (!runs) continue;
    const text = runs
      .map((run) => run.replace(/^<a:t[^>]*>/, "").replace(/<\/a:t>$/, ""))
      .join("")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 0) lines.push(text);
  }
  return lines.join("\n");
}

function slideNumberFromKey(key: string, prefix: string): number {
  const match = key.match(new RegExp(`${prefix}(\\d+)\\.xml$`));
  return match ? parseInt(match[1], 10) : 0;
}

export async function extractPptxSlides(bytes: Uint8Array): Promise<ExtractedUnit[]> {
  const files = unzipSync(bytes);
  const slideKeys = Object.keys(files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  // Guarantee sequential slide order (Slide 1, Slide 2, ..., Slide N)
  slideKeys.sort((a, b) => slideNumberFromKey(a, "slide") - slideNumberFromKey(b, "slide"));

  const noteKeys = new Map<string, string>();
  for (const key of Object.keys(files)) {
    const match = key.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/);
    if (match) noteKeys.set(match[1], key);
  }

  if (slideKeys.length === 0) {
    throw new Error("No slides found in this PPTX file.");
  }

  const decoder = new TextDecoder("utf-8");
  const units: ExtractedUnit[] = [];
  let lastTopic = "";

  for (const key of slideKeys) {
    const num = slideNumberFromKey(key, "slide");
    const xml = decoder.decode(files[key]);
    let text = textFromSlideXml(xml);
    const noteKey = noteKeys.get(String(num));
    if (noteKey) {
      const noteText = textFromSlideXml(decoder.decode(files[noteKey]));
      if (noteText.trim().length > 0) text += `\n[Speaker notes] ${noteText}`;
    }

    // Check for images or shape descriptors
    const descrMatches = Array.from(xml.matchAll(/descr="([^"]+)"/g)).map((m) => m[1]);
    const validDescrs = descrMatches.filter((d) => d && d !== "Lightbox" && d.trim().length > 2);

    if (validDescrs.length > 0) {
      text += `\n[Diagram description: ${validDescrs.join("; ")}]`;
    }

    const trimmed = text.trim();
    const isOnlyNumber = /^\d+$/.test(trimmed);

    // If the slide text is empty or only a slide number (e.g. an architecture diagram / illustration slide):
    if (trimmed.length === 0 || isOnlyNumber) {
      const topicContext = lastTopic ? ` relating to ${lastTopic}` : "";
      text = `Slide ${num}: Visual diagram / architecture illustration${topicContext}.\n${trimmed}`.trim();
    } else {
      // Keep track of the slide's main heading/title for subsequent diagram context
      const firstLine = trimmed.split("\n")[0]?.replace(/^Slide \d+:\s*/, "").trim();
      if (firstLine && firstLine.length > 3 && !/^\d+$/.test(firstLine)) {
        lastTopic = firstLine;
      }
    }

    units.push({ num, text });
  }
  return units;
}

// ---------------------------------------------------------------------------
// PPT — legacy binary OLE2 format. PowerPoint stores text as UTF-16LE runs, so
// we harvest printable sequences. Best-effort: slide numbers are sequential
// because real slide boundaries are not recoverable without a full OLE parser.
// ---------------------------------------------------------------------------

/** Collect printable runs from a decoded string, dropping control noise. */
function harvestPrintableRuns(text: string, minRun: number): string[] {
  const runs: string[] = [];
  let current = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "\n" || char === "\r") {
      if (current.trim().length >= minRun) runs.push(current.trim());
      current = "";
      continue;
    }
    if (code >= 32 && code !== 127 && !(code >= 0xf000 && code <= 0xf0ff)) {
      current += char;
    } else if (current) {
      if (current.trim().length >= minRun) runs.push(current.trim());
      current = "";
    }
  }
  if (current.trim().length >= minRun) runs.push(current.trim());
  return runs;
}

export async function extractPptText(bytes: Uint8Array): Promise<ExtractedUnit[]> {
  const utf16 = new TextDecoder("utf-16le").decode(bytes);
  let runs = harvestPrintableRuns(utf16, 6);

  // Some decks store text as plain ASCII instead.
  if (runs.length === 0) {
    const ascii = new TextDecoder("latin1").decode(bytes);
    runs = harvestPrintableRuns(ascii, 8);
  }
  if (runs.length === 0) {
    throw new Error("No readable text found in this legacy PPT file.");
  }

  // De-noise: drop obvious duplicates and pure-symbol fragments, group into
  // pseudo-slides of ~8 runs so citations stay granular but not noisy.
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    if (/^[\s\d.,;:/\\\-–—|()]+$/.test(run)) continue;
    const key = run.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(run);
  }

  const units: ExtractedUnit[] = [];
  for (let i = 0; i < cleaned.length; i += 8) {
    units.push({ num: units.length + 1, text: cleaned.slice(i, i + 8).join("\n") });
  }
  return units;
}

/** Dispatch by stored kind. Never throws for format errors the caller should surface. */
export async function extractStoredFile(fileKind: FileKind, bytes: Uint8Array): Promise<ExtractedUnit[]> {
  switch (fileKind) {
    case "pdf":
      return extractPdfPages(bytes);
    case "pptx":
      return extractPptxSlides(bytes);
    case "ppt":
      return extractPptText(bytes);
  }
}
