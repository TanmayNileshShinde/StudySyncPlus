"use node";

// TEMPORARY experiment: verify PDF text extraction works inside a Convex node action.

// Must run before pdfjs evaluates: import order is preserved by the bundler.
import "./pdfjsPolyfill";
import "./pdfjsWorkerSetup";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { PDFParse } from "pdf-parse";

export const testPdfExtract = action({
  args: { resourceId: v.id("resources") },
  returns: v.object({ pages: v.number(), firstSnippet: v.string() }),
  handler: async (ctx, args) => {
    const url: string | null = await ctx.runQuery(internal.scratchInternal.getStorageUrl, {
      resourceId: args.resourceId,
    });
    if (!url) throw new Error("No storage URL");
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());

    const parser = new PDFParse(bytes);
    const result = await parser.getText();
    const pages = result.pages ?? [];
    return {
      pages: pages.length,
      firstSnippet: (pages[0]?.text ?? "").slice(0, 120),
    };
  },
});
