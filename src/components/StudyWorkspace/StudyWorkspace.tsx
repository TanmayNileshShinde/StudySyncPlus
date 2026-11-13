import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useResources } from '../../context/ResourceContext';
import { WorkspaceAssistant } from './WorkspaceAssistant';
import { DocumentViewer } from './DocumentViewer';
import {
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface StudyWorkspaceProps {
  documentId: string;
  initialPage?: number;
}

const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 680;

export const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({
  documentId,
  initialPage
}) => {
  const {
    resources,
    isLibraryLoading,
    openHome,
    switchStudyDocument,
    setViewerPage
  } = useResources();

  // Sidebar resizer & collapse state
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mobile segmented view state: 'document' | 'assistant'
  const [mobileTab, setMobileTab] = useState<'document' | 'assistant'>('document');

  // Highlighted citation banner state
  const [highlightedPage, setHighlightedPage] = useState<number | null>(initialPage ?? null);

  // Locate active document from resources
  const activeDocument = useMemo(() => {
    return resources.find((r) => r.id === documentId) ?? null;
  }, [documentId, resources]);

  // Set initial page in viewer context if supplied
  useEffect(() => {
    if (initialPage) {
      setViewerPage(initialPage);
    }
  }, [initialPage, setViewerPage]);

  // Keyboard shortcut: Cmd+\ or Ctrl+\ toggles AI panel collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse / Pointer drag resizing mechanics (Right sidebar: dragging left expands panel)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, startWidth + deltaX)
      );
      setSidebarWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [sidebarWidth]);

  // Citation jump handler: jumps viewer to page, switches document if needed, keeps chat intact
  const handleJumpToCitation = useCallback(
    (resourceId: string, page?: number) => {
      const targetPage = page ?? 1;
      setHighlightedPage(targetPage);
      setViewerPage(targetPage);

      if (resourceId !== documentId) {
        switchStudyDocument(resourceId, targetPage);
      }

      // On mobile screens, automatically switch to document view
      if (window.innerWidth < 768) {
        setMobileTab('document');
      }
    },
    [documentId, switchStudyDocument, setViewerPage]
  );

  if (isLibraryLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-paper p-6 animate-pulse">
        <div className="h-10 bg-paper-sunk border border-rule mb-4 flex items-center px-4" />
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex-1 bg-paper-sunk border border-rule" />
          <div className="w-80 bg-paper-sunk border border-rule hidden md:block" />
        </div>
      </div>
    );
  }

  if (!activeDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh] bg-paper">
        <div className="border border-ink bg-paper p-8 max-w-md w-full shadow-overlay">
          <span className="stamp stamp-alert font-mono mb-3 inline-block">Material Not Found</span>
          <h2 className="text-base font-bold text-ink mb-1.5">Document is unavailable</h2>
          <p className="text-xs text-ink-2 mb-6 leading-relaxed">
            The study material <code className="bg-paper-sunk px-1.5 py-0.5 font-mono text-[11px] text-ink">{documentId}</code> could not be located. It may have been deleted or the link may be mistyped.
          </p>
          <button onClick={openHome} className="btn btn-primary w-full justify-center">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to Course Library</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-paper">
      {/* Mobile Segmented Switcher (Visible only below md breakpoint: < 768px) */}
      <div className="md:hidden border-b border-ink bg-paper p-1.5 flex items-center justify-center shrink-0">
        <div className="flex items-center bg-paper-sunk border border-ink p-0.5 w-full max-w-xs">
          <button
            onClick={() => setMobileTab('document')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-mono font-semibold transition-colors ${
              mobileTab === 'document'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Document</span>
          </button>
          <button
            onClick={() => setMobileTab('assistant')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-mono font-semibold transition-colors ${
              mobileTab === 'assistant'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
            <span>Study AI</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Workspace Splitter: Left Doc Viewer, Right AI Panel */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
        {/* Left Area: Full-Height Document Viewer */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            mobileTab === 'document' ? 'block' : 'max-md:hidden'
          }`}
        >
          <DocumentViewer
            document={activeDocument}
            onSwitchDocument={(newDocId) => switchStudyDocument(newDocId)}
            highlightedCitationPage={highlightedPage}
            onClearCitationHighlight={() => setHighlightedPage(null)}
          />
        </div>

        {/* Resizer Handle (Desktop only) */}
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
          className={`hidden md:flex items-center justify-center w-1.5 hover:w-2 bg-rule hover:bg-lime cursor-col-resize shrink-0 transition-colors z-30 group relative select-none ${
            isDragging ? 'bg-lime w-2' : ''
          }`}
          title="Drag to resize panel · Double-click to reset"
        >
          {/* Quick Collapse / Expand Toggle Button anchored to resizer */}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 w-5 h-8 bg-paper border border-ink hover:bg-lime flex items-center justify-center text-ink shadow-xs transition-colors z-40"
            title={isCollapsed ? 'Expand AI Assistant (Cmd+\\)' : 'Collapse AI Assistant (Cmd+\\)'}
            aria-label={isCollapsed ? 'Expand AI Assistant' : 'Collapse AI Assistant'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Collapsed Expand Tab (when panel is collapsed on desktop) */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="hidden md:flex absolute top-3 right-0 z-40 bg-ink text-paper hover:bg-lime hover:text-ink px-2.5 py-1.5 items-center gap-1.5 text-xs font-mono font-semibold border border-ink shadow-overlay transition-colors"
            title="Open Study Assistant (Cmd+\)"
          >
            <Sparkles className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
            <span>Open Assistant</span>
          </button>
        )}

        {/* Right Sidebar: Collapsible & Resizable AI Panel */}
        <div
          style={{
            width: isCollapsed ? 0 : sidebarWidth
          }}
          className={`shrink-0 h-full border-l border-ink bg-paper transition-[width] duration-150 ease-out flex flex-col overflow-hidden relative ${
            isCollapsed ? 'pointer-events-none' : ''
          } ${mobileTab === 'assistant' ? 'block w-full max-md:w-full' : 'max-md:hidden'}`}
        >
          <div className="w-full h-full flex flex-col" style={{ minWidth: MIN_SIDEBAR_WIDTH }}>
            <WorkspaceAssistant
              activeDocument={activeDocument}
              onJumpToCitation={handleJumpToCitation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
