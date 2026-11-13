import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { asResourceId } from '../../lib/convexIds';
import { useResources } from '../../context/ResourceContext';
import type { StudyResource } from '../../types';
import { init as initPptx } from 'pptx-preview';
import JSZip from 'jszip';
import {
  Presentation,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  AlertCircle,
  RefreshCw,
  FileText,
  LoaderCircle,
  Eye
} from 'lucide-react';

type PPTXPreviewerInstance = ReturnType<typeof initPptx>;

interface PresentationViewerProps {
  document: StudyResource;
  fileUrl?: string | null;
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  zoom?: number;
  fitMode?: 'custom' | 'width' | 'page';
  thumbnailsOpen: boolean;
  onCloseThumbnails: () => void;
  onAskAiAboutSlide?: (slide: number) => void;
  highlightedCitationPage?: number | null;
  onClearCitationHighlight?: () => void;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  document: doc,
  fileUrl: propFileUrl,
  currentSlide,
  onSlideChange,
  zoom = 100,
  fitMode = 'page',
  thumbnailsOpen,
  onCloseThumbnails,
  onAskAiAboutSlide,
  highlightedCitationPage,
  onClearCitationHighlight
}) => {
  const { tagCurrentPage } = useResources();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const slideMountRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<PPTXPreviewerInstance | null>(null);
  const thumbnailRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Convex queries
  const fileData = useQuery(
    api.resources.fileUrl,
    doc && doc.hasFile ? { id: asResourceId(doc.id) } : 'skip'
  );
  const chunksData = useQuery(api.resources.getChunks, { id: asResourceId(doc.id) });

  // Effective file URL (prop, Convex query, or test file fallback)
  const targetUrl = useMemo(() => {
    if (propFileUrl) return propFileUrl;
    if (fileData?.url) return fileData.url;
    // Fallback demo presentation if local test file or development
    return '/test-files/presentation.pptx';
  }, [propFileUrl, fileData?.url]);

  // Viewer state
  const [slideCount, setSlideCount] = useState<number>(doc.chunkCount ?? 1);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 960, height: 540 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 960, height: 600 });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'native' | 'text'>('native');

  // Track container dimensions via ResizeObserver
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: Math.max(320, entry.contentRect.width),
          height: Math.max(300, entry.contentRect.height)
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute responsive scale
  const computedScale = useMemo(() => {
    const availableW = Math.max(280, containerSize.width - 48);
    const availableH = Math.max(240, containerSize.height - 72);

    if (fitMode === 'width') {
      return Math.max(0.3, Math.min(3.0, availableW / baseSize.width));
    }
    if (fitMode === 'page') {
      const scaleW = availableW / baseSize.width;
      const scaleH = availableH / baseSize.height;
      return Math.max(0.3, Math.min(3.0, Math.min(scaleW, scaleH)));
    }
    // Custom zoom percentage
    return Math.max(0.3, Math.min(3.0, (zoom || 100) / 100));
  }, [fitMode, zoom, containerSize, baseSize]);

  // Group chunks by slide number (page) for outline and text fallback
  const slidesOutline = useMemo(() => {
    if (!chunksData || chunksData.length === 0) return [];
    const map = new Map<number, string[]>();

    for (const chunk of chunksData) {
      const slideNum = chunk.page ?? 1;
      const list = map.get(slideNum) ?? [];
      list.push(chunk.text);
      map.set(slideNum, list);
    }

    const sortedSlides: Array<{ slideNum: number; content: string; title: string }> = [];
    const keys = Array.from(map.keys()).sort((a, b) => a - b);

    for (const k of keys) {
      const text = (map.get(k) ?? []).join('\n\n').trim();
      const firstLine = text.split('\n')[0]?.trim() || `Slide ${k}`;
      sortedSlides.push({
        slideNum: k,
        content: text,
        title: firstLine.length > 50 ? `${firstLine.slice(0, 50)}…` : firstLine
      });
    }

    return sortedSlides;
  }, [chunksData]);

  const totalSlides = Math.max(1, slideCount || slidesOutline.length || (doc.chunkCount ?? 1));

  // Initialize and load PPTX with pptx-preview
  const loadPresentation = useCallback(async () => {
    if (!targetUrl || !slideMountRef.current) return;

    let isCurrent = true;
    // Defer initial loading state to avoid synchronous effect setState warning
    await Promise.resolve();
    if (!isCurrent) return;

    setLoading(true);
    setLoadingProgress(25);
    setLoadError(null);

    try {
      // 1. Fetch original PPTX binary stream
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to download presentation (${response.status} ${response.statusText})`);
      }
      setLoadingProgress(55);

      const buffer = await response.arrayBuffer();
      if (!isCurrent) return;
      setLoadingProgress(75);

      // 2. Pre-inspect slide size and count via JSZip to compute exact aspect ratio
      let baseW = 960;
      let baseH = 540;
      let detectedSlides = 0;

      try {
        const zip = await JSZip.loadAsync(buffer);
        const presXml = await zip.files['ppt/presentation.xml']?.async('text');
        if (presXml) {
          const cxMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"/);
          const cyMatch = presXml.match(/<p:sldSz[^>]*cy="(\d+)"/);
          if (cxMatch && cyMatch) {
            const cx = parseInt(cxMatch[1], 10);
            const cy = parseInt(cyMatch[1], 10);
            if (cx > 0 && cy > 0) {
              baseW = Math.round(cx / 12700);
              baseH = Math.round(cy / 12700);
            }
          }
        }
        detectedSlides = Object.keys(zip.files).filter((k) =>
          /^ppt\/slides\/slide\d+\.xml$/.test(k)
        ).length;
      } catch (zipErr) {
        console.warn('Could not pre-parse slide metadata:', zipErr);
      }

      setBaseSize({ width: baseW, height: baseH });
      if (detectedSlides > 0) {
        setSlideCount(detectedSlides);
      }

      // 3. Clear existing mount
      if (slideMountRef.current) {
        slideMountRef.current.innerHTML = '';
      }

      // 4. Initialize pptx-preview instance with exact aspect ratio
      const previewer = initPptx(slideMountRef.current, {
        width: baseW,
        height: baseH,
        mode: 'slide'
      });

      // 5. Load and parse presentation
      await previewer.load(buffer);
      if (!isCurrent) {
        previewer.destroy();
        return;
      }

      previewerRef.current = previewer;
      const finalCount = previewer.slideCount || detectedSlides || 1;
      setSlideCount(finalCount);
      setLoadingProgress(100);
      setLoading(false);

      // 6. Render current slide (0-indexed)
      const initialIndex = Math.max(0, Math.min(finalCount - 1, (currentSlide || 1) - 1));
      previewer.renderSingleSlide(initialIndex);
    } catch (err: any) {
      if (!isCurrent) return;
      console.error('PPTX Preview rendering error:', err);
      setLoadError(
        err?.message || 'Failed to render native presentation. Unsupported PowerPoint feature or corrupt file.'
      );
      setLoading(false);
    }

    return () => {
      isCurrent = false;
    };
  }, [targetUrl, currentSlide]);

  // Load when targetUrl or viewMode changes
  useEffect(() => {
    let active = true;
    if (viewMode === 'native') {
      const timer = setTimeout(() => {
        if (active) {
          void loadPresentation();
        }
      }, 0);

      return () => {
        active = false;
        clearTimeout(timer);
        try {
          previewerRef.current?.destroy();
        } catch {
          // ignore cleanup error
        }
        previewerRef.current = null;
      };
    }
  }, [loadPresentation, viewMode]);

  // Render slide when currentSlide changes in native mode
  useEffect(() => {
    if (viewMode !== 'native' || !previewerRef.current) return;
    const zeroIndex = Math.max(0, Math.min(totalSlides - 1, currentSlide - 1));
    try {
      previewerRef.current.renderSingleSlide(zeroIndex);
    } catch (err) {
      console.warn('Failed to switch slide:', err);
    }
  }, [currentSlide, totalSlides, viewMode]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailsOpen) return;
    const btn = thumbnailRefs.current.get(currentSlide);
    if (btn) {
      btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentSlide, thumbnailsOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        onSlideChange(Math.min(totalSlides, currentSlide + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onSlideChange(Math.max(1, currentSlide - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSlideChange(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        onSlideChange(totalSlides);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides, onSlideChange]);

  const activeSlideOutline = slidesOutline.find((s) => s.slideNum === currentSlide);

  return (
    <div className="flex-1 flex min-h-0 w-full h-full relative overflow-hidden bg-paper-sunk select-text">
      {/* Citation highlight banner */}
      {highlightedCitationPage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-0 left-0 right-0 z-40 bg-lime-wash border-b border-lime px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono animate-fadeIn"
        >
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="w-3.5 h-3.5 text-lime-deep shrink-0" aria-hidden="true" />
            <span>
              <strong>Viewing Slide {highlightedCitationPage}</strong> (Cited by Study Assistant)
            </span>
          </div>
          <button
            onClick={onClearCitationHighlight}
            className="text-ink hover:text-ink-2 font-mono underline text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Slide Thumbnails Drawer (Filmstrip) */}
      {thumbnailsOpen && (
        <aside
          className="w-56 shrink-0 h-full border-r border-rule bg-paper flex flex-col z-30 animate-fadeIn select-none"
          aria-label="Presentation Slide Thumbnails"
        >
          <div className="px-3 py-2 border-b border-rule bg-paper-sunk flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Presentation className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase tracking-[0.08em] font-bold text-ink">
                Slides ({totalSlides})
              </span>
            </div>
            <button
              onClick={onCloseThumbnails}
              className="text-ink-3 hover:text-ink p-1"
              aria-label="Close slide thumbnails"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map((slideNum) => {
              const isActive = slideNum === currentSlide;
              const outline = slidesOutline.find((s) => s.slideNum === slideNum);

              return (
                <button
                  key={slideNum}
                  ref={(el) => {
                    if (el) thumbnailRefs.current.set(slideNum, el);
                    else thumbnailRefs.current.delete(slideNum);
                  }}
                  onClick={() => onSlideChange(slideNum)}
                  className={`w-full text-left p-2.5 border transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-lime/15 border-lime shadow-xs ring-1 ring-lime'
                      : 'bg-paper border-rule hover:border-ink hover:bg-paper-sunk'
                  }`}
                  aria-label={`Go to slide ${slideNum}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-2 group-hover:text-ink">
                      Slide {slideNum}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  {/* Thumbnail snippet */}
                  <div className="h-10 bg-paper-sunk border border-rule/50 p-1.5 overflow-hidden">
                    <p className="text-[10px] text-ink-2 font-mono line-clamp-2 leading-tight">
                      {outline?.title || `Slide ${slideNum} Content`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* Main Slide Presentation Stage & Floating Dock */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <div
          ref={scrollAreaRef}
          className="flex-1 h-full overflow-auto relative p-4 sm:p-8 flex items-center justify-center select-text"
        >
          {/* Loading overlay */}
        {loading && viewMode === 'native' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper-sunk/80 backdrop-blur-[1px] p-4 text-center">
            <LoaderCircle className="w-8 h-8 text-lime-deep animate-spin mb-3" aria-hidden="true" />
            <p className="text-xs font-mono font-bold text-ink uppercase tracking-wider mb-2">
              Rendering Native PowerPoint Slide Deck…
            </p>
            <div className="w-48 h-1.5 bg-paper border border-rule overflow-hidden mb-2">
              <div
                className="h-full bg-lime transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-ink-3">
              Parsing DrawingML shapes, vectors & typography
            </p>
          </div>
        )}

        {/* Error notification banner with fallback option */}
        {loadError && viewMode === 'native' && (
          <div className="absolute top-4 left-4 right-4 z-30 max-w-xl mx-auto p-4 bg-paper border border-red-500 shadow-overlay animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-ink mb-1">Presentation Rendering Notice</h4>
                <p className="text-[11px] text-ink-2 mb-3 leading-relaxed">
                  {loadError}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void loadPresentation()}
                    className="btn btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Native Rendering</span>
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Extracted Slide Content</span>
                  </button>
                  {targetUrl && (
                    <a
                      href={targetUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost text-xs flex items-center gap-1.5 ml-auto font-mono"
                    >
                      <span>Download PPTX</span>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Native Slide Canvas */}
        {viewMode === 'native' ? (
          <div
            className="relative flex items-center justify-center transition-transform duration-100 ease-out"
            style={{
              width: `${baseSize.width * computedScale}px`,
              height: `${baseSize.height * computedScale}px`,
              minWidth: `${baseSize.width * computedScale}px`,
              minHeight: `${baseSize.height * computedScale}px`
            }}
          >
            <div
              style={{
                width: `${baseSize.width}px`,
                height: `${baseSize.height}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              {/* pptx-preview container */}
              <div
                ref={slideMountRef}
                className="w-full h-full bg-paper shadow-overlay border border-rule relative overflow-hidden"
                style={{
                  width: `${baseSize.width}px`,
                  height: `${baseSize.height}px`
                }}
              />
            </div>
          </div>
        ) : (
          /* Text Fallback / Slide Outline Mode */
          <div className="max-w-2xl w-full p-6 sm:p-8 bg-paper border border-rule shadow-overlay animate-fadeIn">
            <div className="flex items-center justify-between border-b border-rule pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-lime-deep" aria-hidden="true" />
                <span className="font-mono text-xs font-bold text-ink">
                  Slide {currentSlide} of {totalSlides} (Extracted Text)
                </span>
              </div>
              <button
                onClick={() => setViewMode('native')}
                className="btn btn-secondary text-xs"
              >
                Switch to Native View
              </button>
            </div>

            <div className="min-h-[220px] bg-paper-sunk border border-rule p-5 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-ink mb-3 leading-snug">
                {activeSlideOutline?.title || doc.title}
              </h3>
              <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {activeSlideOutline?.content || 'No text extracted for this slide.'}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Floating Quick Action Overlay (Centered at Bottom of Presentation Stage) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-paper/95 backdrop-blur-xs border border-ink px-2.5 py-1.5 shadow-overlay select-none max-w-[calc(100%-2rem)]">
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-ink mr-1">
            <span>Slide</span>
            <span className="text-lime-deep">{currentSlide}</span>
            <span className="text-ink-3">/</span>
            <span>{totalSlides}</span>
          </div>

          <div className="h-4 w-px bg-rule" aria-hidden="true" />

          <button
            onClick={() => onSlideChange(Math.max(1, currentSlide - 1))}
            disabled={currentSlide <= 1}
            className="p-1 hover:bg-paper-sunk text-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Slide (ArrowLeft)"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSlideChange(Math.min(totalSlides, currentSlide + 1))}
            disabled={currentSlide >= totalSlides}
            className="p-1 hover:bg-paper-sunk text-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Slide (ArrowRight)"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {onAskAiAboutSlide && (
            <>
              <div className="h-4 w-px bg-rule" aria-hidden="true" />
              <button
                onClick={() => {
                  tagCurrentPage();
                  onAskAiAboutSlide(currentSlide);
                }}
                className="btn btn-ghost text-xs px-2 py-0.5 h-7 font-mono flex items-center gap-1 hover:bg-lime/20"
                title={`Ask Study Assistant about Slide ${currentSlide} (Pins Slide ${currentSlide} as AI focus)`}
              >
                <Sparkles className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-rule" aria-hidden="true" />
          <button
            onClick={() => setViewMode((m) => (m === 'native' ? 'text' : 'native'))}
            className="btn btn-ghost text-xs px-2 py-0.5 h-7 font-mono"
            title={viewMode === 'native' ? 'Switch to text outline' : 'Switch to native presentation'}
          >
            {viewMode === 'native' ? 'Outline' : 'Native'}
          </button>
        </div>
      </div>
    </div>
  );
};
