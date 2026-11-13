import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { asResourceId } from '../../lib/convexIds';
import type { StudyResource } from '../../types';
import {
  Presentation,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface PresentationViewerProps {
  document: StudyResource;
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  thumbnailsOpen: boolean;
  onCloseThumbnails: () => void;
  onAskAiAboutSlide?: (slide: number) => void;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  document: doc,
  currentSlide,
  onSlideChange,
  thumbnailsOpen,
  onAskAiAboutSlide
}) => {
  const fileData = useQuery(api.resources.fileUrl, { id: asResourceId(doc.id) });
  const chunksData = useQuery(api.resources.getChunks, { id: asResourceId(doc.id) });

  // Group chunks by slide number (page)
  const slides = useMemo(() => {
    if (!chunksData || chunksData.length === 0) return [];
    const map = new Map<number, string[]>();

    for (const chunk of chunksData) {
      const slideNum = chunk.page ?? 1;
      const list = map.get(slideNum) ?? [];
      list.push(chunk.text);
      map.set(slideNum, list);
    }

    const sortedSlides: Array<{ slideNum: number; content: string }> = [];
    const keys = Array.from(map.keys()).sort((a, b) => a - b);

    for (const k of keys) {
      sortedSlides.push({
        slideNum: k,
        content: (map.get(k) ?? []).join('\n\n')
      });
    }

    return sortedSlides;
  }, [chunksData]);

  const totalSlides = slides.length > 0 ? slides.length : (doc.chunkCount ?? 1);
  const activeSlideData = slides.find((s) => s.slideNum === currentSlide) ?? slides[0] ?? null;

  return (
    <div className="flex-1 flex min-h-0 w-full h-full relative overflow-hidden bg-paper-sunk">
      {/* Filmstrip / Slides Drawer */}
      {thumbnailsOpen && (
        <aside
          className="w-48 shrink-0 h-full border-r border-rule bg-paper flex flex-col z-20 animate-fadeIn"
          aria-label="Presentation Slides"
        >
          <div className="px-3 py-2 border-b border-rule bg-paper-sunk flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] font-semibold text-ink-3">
              Slides ({totalSlides})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {slides.length === 0 ? (
              <div className="p-3 text-center text-xs text-ink-3 font-mono">
                Loading slide outline…
              </div>
            ) : (
              slides.map((s) => {
                const isActive = s.slideNum === currentSlide;
                return (
                  <button
                    key={s.slideNum}
                    onClick={() => onSlideChange(s.slideNum)}
                    className={`w-full text-left p-2.5 border transition-all ${
                      isActive
                        ? 'bg-lime/15 border-lime shadow-xs'
                        : 'bg-paper border-rule hover:border-ink hover:bg-paper-sunk'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-2">
                        Slide {s.slideNum}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-lime" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink line-clamp-2 leading-tight">
                      {s.content.slice(0, 70)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Slide Canvas */}
      <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
        <div className="ruled max-w-2xl w-full p-6 sm:p-8 bg-paper shadow-overlay relative animate-fadeIn">
          {/* Slide Deck Header */}
          <div className="flex items-center justify-between border-b border-rule pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-ink text-paper flex items-center justify-center shrink-0">
                <Presentation className="w-4 h-4 text-lime" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <span className="stamp stamp-outline text-[9px] font-mono">
                  {doc.fileFormat} SLIDE DECK
                </span>
                <span className="font-mono text-xs font-bold text-ink ml-2">
                  Slide {currentSlide} of {totalSlides}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSlideChange(Math.max(1, currentSlide - 1))}
                disabled={currentSlide <= 1}
                className="btn btn-ghost p-1.5 disabled:opacity-30 disabled:pointer-events-none"
                title="Previous Slide"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSlideChange(Math.min(totalSlides, currentSlide + 1))}
                disabled={currentSlide >= totalSlides}
                className="btn btn-ghost p-1.5 disabled:opacity-30 disabled:pointer-events-none"
                title="Next Slide"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Slide Content Box */}
          <div className="min-h-[220px] bg-paper-sunk border border-rule p-5 sm:p-6 mb-6">
            <h3 className="text-sm sm:text-base font-bold text-ink mb-3 leading-snug">
              {doc.title}
            </h3>

            {activeSlideData ? (
              <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {activeSlideData.content}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-ink-3 font-mono">
                Loading slide content from indexed vector chunks…
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-rule">
            <div className="flex items-center gap-2">
              {onAskAiAboutSlide && (
                <button
                  onClick={() => onAskAiAboutSlide(currentSlide)}
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                  <span>Ask AI About Slide {currentSlide}</span>
                </button>
              )}
            </div>

            {fileData && (
              <a
                href={fileData.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost text-xs font-mono inline-flex items-center gap-1.5"
              >
                <span>Download Presentation</span>
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
