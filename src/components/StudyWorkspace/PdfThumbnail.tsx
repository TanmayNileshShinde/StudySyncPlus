import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

interface PdfThumbnailProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  baseWidth: number;
  baseHeight: number;
  isActive: boolean;
  onClick: () => void;
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({
  pdfDoc,
  pageNum,
  baseWidth,
  baseHeight,
  isActive,
  onClick
}) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Thumbnail dimensions: fixed width ~104px, proportional height
  const thumbWidth = 104;
  const thumbScale = thumbWidth / baseWidth;
  const thumbHeight = Math.round(baseHeight * thumbScale);

  // Lazy render thumbnail when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          }
        });
      },
      {
        rootMargin: '200px 0px 200px 0px',
        threshold: 0
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || rendered) return;

    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy['render']> | null = null;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: thumbScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        renderTask = page.render({
          canvasContext: ctx,
          canvas,
          viewport
        });

        await renderTask.promise;
        if (cancelled) return;
        setRendered(true);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          // ignore thumbnail fail
        }
      }
    };

    void renderThumbnail();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [inView, rendered, pageNum, pdfDoc, thumbScale]);

  return (
    <button
      ref={containerRef}
      onClick={onClick}
      className={`group w-full flex flex-col items-center p-2 text-left transition-all ${
        isActive
          ? 'bg-lime/15 border-l-2 border-lime text-ink'
          : 'hover:bg-paper-sunk text-ink-3 hover:text-ink'
      }`}
      title={`Go to page ${pageNum}`}
    >
      <div
        className={`relative bg-paper border shadow-2xs overflow-hidden transition-colors ${
          isActive
            ? 'border-ink ring-1 ring-ink'
            : 'border-rule group-hover:border-ink'
        }`}
        style={{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }}
      >
        {inView ? (
          <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-paper text-[10px] font-mono text-ink-3">
            {pageNum}
          </div>
        )}
      </div>
      <span className="mt-1.5 font-mono text-[10.5px] tabular font-medium">
        {pageNum}
      </span>
    </button>
  );
};
