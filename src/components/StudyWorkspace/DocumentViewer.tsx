import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useResources } from '../../context/ResourceContext';
import { asResourceId } from '../../lib/convexIds';
import { getOwnerKey } from '../../lib/owner';
import type { StudyResource } from '../../types';
import { PdfViewer } from './PdfViewer';
import { PresentationViewer } from './PresentationViewer';
import confetti from 'canvas-confetti';
import {
  FileText,
  Presentation,
  Download,
  Bookmark,
  Star,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  Share2,
  Printer,
  LayoutGrid
} from 'lucide-react';

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

interface DocumentViewerProps {
  document: StudyResource | null;
  onSwitchDocument: (documentId: string) => void;
  highlightedCitationPage?: number | null;
  onClearCitationHighlight?: () => void;
}

const RatingWidget: React.FC<{ resourceId: string }> = ({ resourceId }) => {
  const { rateResource } = useResources();
  const ownerKey = getOwnerKey();
  const myRating = useQuery(api.ratings.getMine, {
    ownerKey,
    resourceId: asResourceId(resourceId)
  });
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? myRating ?? 0;

  return (
    <div className="flex items-center gap-1.5" title="Peer quality review">
      <div className="flex items-center" role="group" aria-label="Rate this resource">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            onClick={() => void rateResource(resourceId, val)}
            onMouseEnter={() => setHoverValue(val)}
            onMouseLeave={() => setHoverValue(null)}
            className="p-0.5 text-lime-deep hover:text-ink transition-colors"
            aria-label={`Rate ${val} out of 5`}
            aria-pressed={myRating === val}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                val <= displayValue ? 'fill-lime text-lime-deep' : 'text-ink-3'
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-[10px] font-mono text-ink-3 uppercase tabular">
        {myRating ? `${myRating}/5` : 'Rate'}
      </span>
    </div>
  );
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: activeDoc,
  onSwitchDocument,
  highlightedCitationPage,
  onClearCitationHighlight
}) => {
  const {
    resources,
    subjects,
    toggleBookmark,
    isBookmarked,
    downloadResource,
    viewerPage,
    setViewerPage,
    viewerZoom,
    setViewerZoom,
    openAssistant,
    showToast
  } = useResources();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [fitMode, setFitMode] = useState<'custom' | 'width' | 'page'>('width');
  const [localPageInput, setLocalPageInput] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  const displayPage = localPageInput ?? String(viewerPage ?? 1);

  // Close switcher on outside click
  useEffect(() => {
    if (!switcherOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [switcherOpen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };
    window.document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => window.document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch real file URL from Convex Storage
  const fileData = useQuery(
    api.resources.fileUrl,
    activeDoc && activeDoc.hasFile ? { id: asResourceId(activeDoc.id) } : 'skip'
  );

  const bookmarked = activeDoc ? isBookmarked(activeDoc.id) : false;
  const isDeck = activeDoc?.fileKind === 'ppt' || activeDoc?.fileKind === 'pptx';

  // Sibling resources in same subject for quick switching
  const siblingResources = useMemo(() => {
    if (!activeDoc) return [];
    return resources.filter((r) => r.subjectId === activeDoc.subjectId);
  }, [activeDoc, resources]);

  // Active subject name
  const subjectName = useMemo(() => {
    if (!activeDoc) return 'Academic Course';
    const sub = subjects.find((s) => s.id === activeDoc.subjectId);
    return sub ? sub.name : activeDoc.subjectName;
  }, [activeDoc, subjects]);

  const handleDownload = () => {
    if (!activeDoc) return;
    void downloadResource(activeDoc);
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.7 },
      colors: CONFETTI_COLORS
    });
  };

  const handlePrint = () => {
    if (!fileData?.url) {
      window.print();
      return;
    }

    try {
      // Use clean hidden iframe print for authentic vector printing
      const printIframe = window.document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = fileData.url;

      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.print();
        }
      };

      window.document.body.appendChild(printIframe);
      setTimeout(() => {
        if (window.document.body.contains(printIframe)) {
          window.document.body.removeChild(printIframe);
        }
      }, 60000);
    } catch {
      window.print();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Document link copied to clipboard');
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!window.document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await window.document.exitFullscreen();
      }
    } catch {
      showToast('Fullscreen mode not available in this browser window');
    }
  };

  const handlePageChange = (newPage: number) => {
    const safePage = Math.max(1, newPage);
    setViewerPage(safePage);
    setLocalPageInput(null);
    onClearCitationHighlight?.();
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(displayPage, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handlePageChange(parsed);
    } else {
      setLocalPageInput(null);
    }
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setViewerZoom(Math.min(250, (viewerZoom ?? 100) + 15));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setViewerZoom(Math.max(50, (viewerZoom ?? 100) - 15));
  };

  const handleZoomReset = () => {
    setFitMode('custom');
    setViewerZoom(100);
  };

  const handleFitWidth = () => {
    setFitMode('width');
  };

  if (!activeDoc) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-paper-sunk text-center">
        <div className="ruled p-8 max-w-md bg-paper">
          <BookOpen className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink mb-1">No Document Selected</h3>
          <p className="text-xs text-ink-2 mb-4">
            Select a document from your course shelf or click any document citation to start reading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col min-w-0 bg-paper-sunk overflow-hidden select-text ${
        isFullscreen ? 'fixed inset-0 z-50 bg-paper' : 'relative h-full'
      }`}
    >
      {/* Minimal Academic Toolbar matching StudySyncPlus Design System */}
      <header className="border-b border-ink bg-paper px-2.5 sm:px-3 h-11 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Document Switcher & Thumbnails Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Thumbnails Toggle Button (PDF and PPT) */}
          <button
            onClick={() => setThumbnailsOpen((v) => !v)}
            className={`btn btn-ghost px-2 py-1 h-8 text-xs font-mono flex items-center gap-1.5 shrink-0 ${
              thumbnailsOpen ? 'bg-ink text-paper hover:bg-ink hover:text-paper' : ''
            }`}
            title={thumbnailsOpen ? 'Hide Page Thumbnails' : 'Show Page Thumbnails'}
            aria-pressed={thumbnailsOpen}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">{isDeck ? 'Slides' : 'Pages'}</span>
          </button>

          <span className="h-4 w-px bg-rule shrink-0 hidden sm:inline-block" aria-hidden="true" />

          {/* Quick Document Switcher */}
          <div ref={switcherRef} className="relative shrink-0 z-40">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-1.5 text-left px-2 py-1 h-8 border border-rule hover:border-ink bg-paper transition-colors group max-w-[140px] sm:max-w-[190px] shrink-0 cursor-pointer"
              title={`Switch document (Current: ${activeDoc.title})`}
              aria-expanded={switcherOpen}
            >
              {isDeck ? (
                <Presentation className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" aria-hidden="true" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" aria-hidden="true" />
              )}
              <span className="font-bold text-xs text-ink truncate leading-tight">
                {activeDoc.title}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-ink-3 group-hover:text-ink shrink-0 ml-0.5 transition-transform duration-150 ${
                  switcherOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Sibling Documents Dropdown */}
            {switcherOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-80 max-h-72 overflow-y-auto bg-paper border border-ink shadow-overlay animate-fadeIn">
                <div className="px-3 py-2 border-b border-rule bg-paper-sunk flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.08em] font-semibold text-ink-3">
                    Course Materials ({siblingResources.length})
                  </span>
                  <button
                    onClick={() => setSwitcherOpen(false)}
                    className="text-ink-3 hover:text-ink"
                    aria-label="Close document switcher"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-1 space-y-0.5">
                  {siblingResources.length === 0 ? (
                    <p className="p-3 text-xs text-ink-3 text-center">No other course materials in this subject.</p>
                  ) : (
                    siblingResources.map((res) => {
                      const active = res.id === activeDoc.id;
                      const resIsDeck = res.fileKind === 'ppt' || res.fileKind === 'pptx';
                      return (
                        <button
                          key={res.id}
                          onClick={() => {
                            onSwitchDocument(res.id);
                            setSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 flex items-start gap-2 transition-colors ${
                            active
                              ? 'bg-lime/15 font-semibold text-ink'
                              : 'hover:bg-paper-sunk text-ink-2 hover:text-ink'
                          }`}
                        >
                          {resIsDeck ? (
                            <Presentation className="w-3.5 h-3.5 mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs truncate">{res.title}</p>
                            <p className="text-[10px] font-mono text-ink-3">
                              {res.fileFormat} · {res.type}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Page Navigation & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Page / Slide Stepper */}
          <div className="flex items-center border border-rule bg-paper h-8 shrink-0">
            <button
              onClick={() => handlePageChange((viewerPage ?? 1) - 1)}
              disabled={(viewerPage ?? 1) <= 1}
              className="px-1.5 h-full text-ink-2 hover:text-ink hover:bg-paper-sunk disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-rule"
              title="Previous Page / Slide"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center px-1.5">
              <span className="text-[10px] font-mono text-ink-3 mr-1 hidden sm:inline">
                {isDeck ? 'Slide' : 'Page'}
              </span>
              <input
                type="text"
                value={displayPage}
                onChange={(e) => setLocalPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                className="w-7 text-center text-xs font-mono font-bold bg-transparent border-none outline-none text-ink p-0"
                aria-label="Current Page Number"
              />
            </form>

            <button
              onClick={() => handlePageChange((viewerPage ?? 1) + 1)}
              className="px-1.5 h-full text-ink-2 hover:text-ink hover:bg-paper-sunk transition-colors border-l border-rule"
              title="Next Page / Slide"
              aria-label="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Zoom Controls (Active in PDF mode) */}
          {!isDeck && (
            <div className="hidden 2xl:flex items-center border border-rule bg-paper h-8 shrink-0">
              <button
                onClick={handleZoomOut}
                className="px-1.5 h-full text-ink-2 hover:text-ink hover:bg-paper-sunk transition-colors border-r border-rule"
                title="Zoom Out (Cmd -)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={handleZoomReset}
                className="px-2 h-full text-[10.5px] font-mono font-semibold text-ink hover:bg-paper-sunk transition-colors tabular"
                title="Reset Zoom to 100%"
              >
                {fitMode === 'width' ? 'Fit W' : fitMode === 'page' ? 'Fit P' : `${viewerZoom ?? 100}%`}
              </button>
              <button
                onClick={handleZoomIn}
                className="px-1.5 h-full text-ink-2 hover:text-ink hover:bg-paper-sunk transition-colors border-l border-rule"
                title="Zoom In (Cmd +)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={handleFitWidth}
                className={`px-1.5 h-full text-[10px] font-mono border-l border-rule transition-colors ${
                  fitMode === 'width' ? 'bg-lime/20 font-bold text-ink' : 'text-ink-2 hover:bg-paper-sunk'
                }`}
                title="Fit to Width"
              >
                Fit
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions (Print, Download, Rate, Bookmark, Fullscreen, Info) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="hidden 2xl:block">
            <RatingWidget resourceId={activeDoc.id} />
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="btn btn-ghost p-1.5"
            title="Print Document"
            aria-label="Print Document"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => void toggleBookmark(activeDoc.id)}
            className={`btn btn-ghost p-1.5 ${bookmarked ? 'text-lime-deep' : 'text-ink-2'}`}
            title={bookmarked ? 'Remove from saved revision list' : 'Save for revision'}
            aria-label="Bookmark document"
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-lime' : ''}`} aria-hidden="true" />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="btn btn-primary px-2.5 py-1 text-xs"
            title={`Download ${activeDoc.title}`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="btn btn-ghost p-1.5"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reading Mode'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reading Mode'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Info Slideout Button */}
          <button
            onClick={() => setInfoOpen((v) => !v)}
            className={`btn btn-ghost p-1.5 ${infoOpen ? 'bg-paper-sunk text-ink' : 'text-ink-2'}`}
            title="Document metadata & course provenance"
            aria-label="Document info"
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Active Citation Highlight Banner */}
      {highlightedCitationPage && (
        <div className="bg-lime/20 border-b border-lime px-4 py-1.5 flex items-center justify-between text-xs text-ink font-mono animate-fadeIn z-10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-lime-deep shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              Viewing {isDeck ? 'Slide' : 'Page'} {highlightedCitationPage}
            </span>
            <span className="text-ink-2 text-[11px] truncate hidden sm:inline">
              (Cited by Study Assistant)
            </span>
          </div>
          <button
            onClick={onClearCitationHighlight}
            className="text-[11px] underline text-ink hover:text-ink-2 ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-0 w-full overflow-hidden flex bg-paper-sunk">
        {/* PDF Mode -> Custom PDF.js Viewer */}
        {!isDeck && activeDoc.hasFile && (
          <div className="w-full h-full relative">
            {fileData?.url ? (
              <PdfViewer
                key={fileData.url}
                fileUrl={fileData.url}
                documentTitle={activeDoc.title}
                currentPage={viewerPage ?? 1}
                onPageChange={(p) => setViewerPage(p)}
                zoom={viewerZoom ?? 100}
                fitMode={fitMode}
                thumbnailsOpen={thumbnailsOpen}
                onCloseThumbnails={() => setThumbnailsOpen(false)}
                highlightedCitationPage={highlightedCitationPage}
                onClearCitationHighlight={onClearCitationHighlight}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-ink-3 font-mono">
                Connecting to Convex storage stream…
              </div>
            )}
          </div>
        )}

        {/* Presentation Mode -> Dedicated Slide Deck Viewer */}
        {isDeck && activeDoc.hasFile && (
          <PresentationViewer
            document={activeDoc}
            currentSlide={viewerPage ?? 1}
            onSlideChange={(s) => setViewerPage(s)}
            thumbnailsOpen={thumbnailsOpen}
            onCloseThumbnails={() => setThumbnailsOpen(false)}
            onAskAiAboutSlide={(_slideNum) => {
              openAssistant({ mode: 'resource', resourceId: activeDoc.id });
            }}
          />
        )}

        {/* Legacy Course File Card (No file uploaded) */}
        {!activeDoc.hasFile && (
          <div className="w-full h-full overflow-y-auto p-6 sm:p-10 flex items-center justify-center bg-paper-sunk">
            <div className="ruled max-w-lg w-full p-6 sm:p-8 bg-paper shadow-overlay">
              <div className="flex items-center gap-2 mb-3">
                <span className="stamp stamp-ink font-mono">{activeDoc.courseCode}</span>
                <span className="stamp stamp-outline">{activeDoc.type}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-ink mb-2 leading-tight">
                {activeDoc.title}
              </h3>
              <p className="text-xs text-ink-2 mb-6 leading-relaxed">
                {activeDoc.description || 'Official course syllabus record catalogued in the SAKEC Semester III course file.'}
              </p>

              <div className="p-3 bg-paper-sunk border border-rule mb-5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-3 font-mono">Subject:</span>
                  <span className="font-semibold text-ink">{subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3 font-mono">Uploaded by:</span>
                  <span className="text-ink">{activeDoc.uploadedBy} ({activeDoc.rollNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3 font-mono">Catalog Date:</span>
                  <span className="font-mono text-ink">{activeDoc.uploadDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="btn btn-primary flex-1">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download Summary Card</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Slideout Drawer */}
        {infoOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-paper border-l border-ink shadow-overlay p-4 overflow-y-auto animate-fadeIn z-30">
            <div className="flex items-center justify-between pb-3 border-b border-rule mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
                Document Details
              </span>
              <button
                onClick={() => setInfoOpen(false)}
                className="btn btn-ghost p-1"
                aria-label="Close document details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 block mb-1">
                  Title & Course
                </span>
                <p className="font-bold text-ink">{activeDoc.title}</p>
                <p className="text-ink-2 font-mono text-[11px] mt-0.5">
                  {subjectName} ({activeDoc.courseCode})
                </p>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 block mb-1">
                  Overview
                </span>
                <p className="text-ink-2 leading-relaxed">
                  {activeDoc.description || 'No additional description provided.'}
                </p>
              </div>

              <div className="border-t border-rule pt-3 space-y-2">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">Resource Type:</span>
                  <span className="text-ink font-semibold">{activeDoc.type}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">Format:</span>
                  <span className="text-ink font-semibold">{activeDoc.fileFormat}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">File Size:</span>
                  <span className="text-ink font-semibold">{activeDoc.fileSize}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">Contributor:</span>
                  <span className="text-ink">{activeDoc.uploadedBy}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">Roll Number:</span>
                  <span className="text-ink font-mono">{activeDoc.rollNumber}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">Upload Date:</span>
                  <span className="text-ink font-mono">{activeDoc.uploadDate}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-ink-3">AI Passages:</span>
                  <span className="text-lime-deep font-bold font-mono">
                    {activeDoc.chunkCount ?? 0} indexed
                  </span>
                </div>
              </div>

              {activeDoc.tags && activeDoc.tags.length > 0 && (
                <div className="border-t border-rule pt-3">
                  <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 block mb-2">
                    Topics & Tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeDoc.tags.map((tag, i) => (
                      <span key={i} className="stamp stamp-outline text-[10px] font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-rule pt-4 flex gap-2">
                <button onClick={handleCopyLink} className="btn btn-secondary flex-1 text-xs">
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
