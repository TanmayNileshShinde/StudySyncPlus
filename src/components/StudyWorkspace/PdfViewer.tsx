import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../../lib/pdfjsWorker';
import { PdfPage } from './PdfPage';
import { PdfThumbnail } from './PdfThumbnail';
import { LoaderCircle, AlertCircle, X } from 'lucide-react';

interface PdfViewerProps {
  fileUrl: string;
  documentTitle: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  fitMode: 'custom' | 'width' | 'page';
  thumbnailsOpen: boolean;
  onCloseThumbnails: () => void;
  highlightedCitationPage?: number | null;
  onClearCitationHighlight?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  documentTitle,
  currentPage,
  onPageChange,
  zoom,
  fitMode,
  thumbnailsOpen,
  onCloseThumbnails,
  highlightedCitationPage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 }); // A4 default
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(900);

  const loading = loadedUrl !== fileUrl && !loadError;

  // ResizeObserver to track available viewer dimensions for fit modes
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load PDF Document via PDF.js with progress tracking and abort cleanup
  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      withCredentials: false,
      cMapPacked: true
    });

    loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (total > 0) {
        setLoadingProgress(Math.min(95, Math.round((loaded / total) * 100)));
      }
    };

    loadingTask.promise
      .then(async (doc) => {
        setPdfDoc(doc);
        setLoadedUrl(fileUrl);
        setNumPages(doc.numPages);
        setLoadingProgress(100);

        try {
          const firstPage = await doc.getPage(1);
          const vp = firstPage.getViewport({ scale: 1 });
          setBaseSize({ width: vp.width, height: vp.height });
        } catch {
          // Keep default A4 size
        }
      })
      .catch((err: any) => {
        if (err?.name !== 'WorkerDestroyedException' && err?.name !== 'AbortException') {
          console.error('Failed to load PDF with PDF.js:', err);
          setLoadError(err?.message || 'Failed to load PDF document.');
        }
      });

    return () => {
      try {
        void loadingTask.destroy();
      } catch {
        // ignore destroy errors
      }
    };
  }, [fileUrl]);

  // Compute actual scale based on fit mode & zoom percentage
  const computedScale = useMemo(() => {
    if (fitMode === 'width') {
      const availableWidth = Math.max(320, containerWidth - 48);
      return Math.max(0.4, Math.min(2.5, availableWidth / baseSize.width));
    }
    if (fitMode === 'page') {
      const availableWidth = Math.max(320, containerWidth - 48);
      const availableHeight = Math.max(400, containerHeight - 64);
      const scaleW = availableWidth / baseSize.width;
      const scaleH = availableHeight / baseSize.height;
      return Math.max(0.4, Math.min(2.5, Math.min(scaleW, scaleH)));
    }
    // Custom zoom percentage
    return Math.max(0.4, Math.min(2.5, (zoom || 100) / 100));
  }, [fitMode, zoom, containerWidth, containerHeight, baseSize]);

  // Scroll to target page smoothly
  const scrollToPage = useCallback((pageNum: number, smooth = true) => {
    if (!scrollAreaRef.current) return;
    const targetEl = scrollAreaRef.current.querySelector(`[data-page-number="${pageNum}"]`) as HTMLElement;
    if (targetEl) {
      isProgrammaticScroll.current = true;
      targetEl.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start'
      });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  }, []);

  // Jump to currentPage when it changes externally (e.g. from citation or toolbar)
  useEffect(() => {
    if (pdfDoc && currentPage > 0 && !isProgrammaticScroll.current) {
      scrollToPage(currentPage, true);
    }
  }, [currentPage, pdfDoc, scrollToPage]);

  // Track visible page on scroll using IntersectionObserver
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current;
    if (!scrollContainer || !pdfDoc) return;

    const pageElements = scrollContainer.querySelectorAll('.pdf-page-container');
    if (pageElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }

        if (bestEntry) {
          const pageNum = parseInt(bestEntry.target.getAttribute('data-page-number') || '1', 10);
          if (pageNum && pageNum !== currentPage) {
            onPageChange(pageNum);
          }
        }
      },
      {
        root: scrollContainer,
        threshold: [0.1, 0.4, 0.7]
      }
    );

    pageElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pdfDoc, numPages, computedScale, currentPage, onPageChange]);

  // Keyboard navigation for power study (PageUp, PageDown, Home, End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.altKey)) {
        e.preventDefault();
        const next = Math.min(numPages, currentPage + 1);
        onPageChange(next);
        scrollToPage(next);
      } else if (e.key === 'PageUp' || (e.key === 'ArrowUp' && e.altKey)) {
        e.preventDefault();
        const prev = Math.max(1, currentPage - 1);
        onPageChange(prev);
        scrollToPage(prev);
      } else if (e.key === 'Home' && e.altKey) {
        e.preventDefault();
        onPageChange(1);
        scrollToPage(1);
      } else if (e.key === 'End' && e.altKey) {
        e.preventDefault();
        onPageChange(numPages);
        scrollToPage(numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, currentPage, onPageChange, scrollToPage]);

  // Page index array: [1, 2, ..., numPages]
  const pageNumbers = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  return (
    <div ref={containerRef} className="flex-1 flex min-h-0 w-full h-full relative overflow-hidden bg-paper-sunk">
      {/* Collapsible Page Thumbnails Rail */}
      {thumbnailsOpen && (
        <aside
          className="w-36 shrink-0 h-full border-r border-rule bg-paper flex flex-col z-20 animate-fadeIn"
          aria-label="Document Page Thumbnails"
        >
          <div className="px-3 py-2 border-b border-rule bg-paper-sunk flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] font-semibold text-ink-3">
              Pages ({numPages})
            </span>
            <button
              onClick={onCloseThumbnails}
              className="text-ink-3 hover:text-ink p-0.5"
              title="Close Thumbnails"
              aria-label="Close Thumbnails"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {pdfDoc &&
              pageNumbers.map((p) => (
                <PdfThumbnail
                  key={p}
                  pdfDoc={pdfDoc}
                  pageNum={p}
                  baseWidth={baseSize.width}
                  baseHeight={baseSize.height}
                  isActive={currentPage === p}
                  onClick={() => {
                    onPageChange(p);
                    scrollToPage(p);
                  }}
                />
              ))}
          </div>
        </aside>
      )}

      {/* Main Scrollable PDF Canvas Area */}
      <div
        ref={scrollAreaRef}
        tabIndex={0}
        aria-label={`PDF Document: ${documentTitle}`}
        className="flex-1 h-full overflow-y-auto overflow-x-auto p-4 sm:p-6 focus:outline-none scroll-smooth relative"
      >
        {/* Loading Spinner with Progress */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper-sunk/80 backdrop-blur-xs z-30">
            <div className="ruled p-6 max-w-sm w-full text-center bg-paper shadow-overlay">
              <LoaderCircle className="w-8 h-8 animate-spin text-lime-deep mx-auto mb-3" aria-hidden="true" />
              <h4 className="text-sm font-bold text-ink mb-1">Loading Document</h4>
              <p className="text-xs text-ink-2 mb-3 truncate font-mono">{documentTitle}</p>
              <div className="w-full bg-paper-sunk border border-rule h-2 overflow-hidden mb-2">
                <div
                  className="bg-lime h-full transition-all duration-200"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <span className="font-mono text-[10.5px] text-ink-3">{loadingProgress}% streamed</span>
            </div>
          </div>
        )}

        {/* Load Error State */}
        {loadError && (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="ruled max-w-md p-6 bg-paper text-center">
              <AlertCircle className="w-8 h-8 text-alert mx-auto mb-3" aria-hidden="true" />
              <h4 className="text-sm font-bold text-ink mb-1">Could Not Open PDF</h4>
              <p className="text-xs text-ink-2 mb-4 leading-relaxed">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary text-xs"
              >
                Reload Document
              </button>
            </div>
          </div>
        )}

        {/* Rendered Document Pages */}
        {pdfDoc && (
          <div className="flex flex-col items-center min-w-min mx-auto pb-16">
            {pageNumbers.map((p) => (
              <PdfPage
                key={p}
                pdfDoc={pdfDoc}
                pageNum={p}
                scale={computedScale}
                baseWidth={baseSize.width}
                baseHeight={baseSize.height}
                isCited={highlightedCitationPage === p}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
