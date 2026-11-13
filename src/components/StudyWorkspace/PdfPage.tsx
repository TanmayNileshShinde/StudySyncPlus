import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../../lib/pdfjsWorker';
import { Sparkles, LoaderCircle } from 'lucide-react';

interface PdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  scale: number;
  baseWidth: number;
  baseHeight: number;
  isCited: boolean;
}

export const PdfPage: React.FC<PdfPageProps> = ({
  pdfDoc,
  pageNum,
  scale,
  baseWidth,
  baseHeight,
  isCited
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const pageWidth = Math.round(baseWidth * scale);
  const pageHeight = Math.round(baseHeight * scale);

  // Intersection observer to mount/render only when approaching viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          } else {
            // Keep rendered in memory if close, or unmount if far to conserve GPU memory
            const rect = entry.boundingClientRect;
            const vh = window.innerHeight;
            if (rect.bottom < -vh * 2 || rect.top > vh * 3) {
              setInView(false);
              setRendered(false);
            }
          }
        });
      },
      {
        rootMargin: '500px 0px 500px 0px',
        threshold: 0
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render page when inView and scale changes
  useEffect(() => {
    if (!inView) return;

    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy['render']> | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        renderTask = page.render({
          canvasContext: ctx,
          canvas,
          viewport,
          transform: transform ?? undefined
        });

        await renderTask.promise;
        if (cancelled) return;

        // Render searchable/selectable Text Layer
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
          textLayerDiv.style.setProperty('--scale-factor', `${scale}`);

          const textContent = await page.getTextContent();
          if (cancelled) return;

          const textLayer = new (pdfjsLib as any).TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport
          });

          await textLayer.render();
        }

        setRendered(true);
        setRenderError(null);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          console.warn(`Error rendering PDF page ${pageNum}:`, err);
          setRenderError('Could not render page');
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore cancellation exceptions
        }
      }
    };
  }, [inView, pageNum, pdfDoc, scale]);

  return (
    <div
      ref={containerRef}
      data-page-number={pageNum}
      className={`pdf-page-container relative bg-paper shadow-xs transition-shadow my-4 mx-auto select-text ${
        isCited
          ? 'ring-2 ring-lime ring-offset-4 ring-offset-paper-sunk shadow-md'
          : 'border border-rule hover:border-ink/40'
      }`}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`
      }}
    >
      {/* Cited Page Badge */}
      {isCited && (
        <div className="absolute -top-3.5 left-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 bg-lime text-ink font-mono text-[10.5px] font-bold shadow-xs">
          <Sparkles className="w-3 h-3 text-ink" aria-hidden="true" />
          <span>Cited in Study Assistant · Page {pageNum}</span>
        </div>
      )}

      {/* Canvas Layer */}
      {inView ? (
        <>
          <canvas
            ref={canvasRef}
            className="block w-full h-full pointer-events-none"
            aria-label={`Page ${pageNum}`}
          />
          {/* Interactive Text Selection Layer */}
          <div
            ref={textLayerRef}
            className="textLayer absolute inset-0 z-10 pointer-events-auto"
          />
        </>
      ) : (
        /* Off-screen Placeholder */
        <div className="w-full h-full flex flex-col items-center justify-center bg-paper text-ink-3">
          <span className="font-mono text-xs font-semibold">Page {pageNum}</span>
        </div>
      )}

      {/* Loading state before first render */}
      {inView && !rendered && !renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/60 backdrop-blur-xs z-15">
          <div className="flex items-center gap-2 font-mono text-xs text-ink-2 bg-paper px-3 py-1.5 border border-rule shadow-xs">
            <LoaderCircle className="w-3.5 h-3.5 animate-spin text-lime-deep" aria-hidden="true" />
            <span>Rendering page {pageNum}…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper text-alert z-15">
          <p className="font-mono text-xs">{renderError}</p>
        </div>
      )}
    </div>
  );
};
