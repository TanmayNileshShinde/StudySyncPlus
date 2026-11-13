import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useResources } from '../../context/ResourceContext';
import { getOwnerKey } from '../../lib/owner';
import { asResourceId, asSubjectId, asSemesterId, asThreadId, asFolderId } from '../../lib/convexIds';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { StudyResource, StudyScopeKind } from '../../types';
import {
  Sparkles,
  Send,
  PlusCircle,
  History,
  Trash2,
  FileText,
  Presentation,
  LoaderCircle,
  Library,
  Layers,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Folder as FolderIcon
} from 'lucide-react';

interface CitationChipProps {
  resourceTitle: string;
  page?: number;
  fileKind?: string;
  isActiveDoc: boolean;
  onOpen: () => void;
}

const CitationChip: React.FC<CitationChipProps> = ({
  resourceTitle,
  page,
  fileKind,
  isActiveDoc,
  onOpen
}) => {
  const isDeck = fileKind === 'ppt' || fileKind === 'pptx';
  return (
    <button
      onClick={onOpen}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-mono transition-colors max-w-full text-left group ${
        isActiveDoc
          ? 'bg-lime/10 border-lime text-ink hover:bg-lime/20'
          : 'bg-paper border-rule hover:border-ink hover:bg-paper-sunk text-ink'
      }`}
      title={
        isActiveDoc
          ? `Jump to ${isDeck ? 'slide' : 'page'} ${page ?? 1} in current document`
          : `Switch to ${resourceTitle} at ${isDeck ? 'slide' : 'page'} ${page ?? 1}`
      }
    >
      {isDeck ? (
        <Presentation className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" aria-hidden="true" />
      ) : (
        <FileText className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" aria-hidden="true" />
      )}
      <span className="truncate max-w-[170px] font-medium">{resourceTitle}</span>
      {page ? (
        <span className="text-lime-deep font-bold shrink-0 bg-lime/25 px-1 py-0.5 leading-none">
          {isDeck ? 'Slide' : 'Page'} {page}
        </span>
      ) : null}
      <ExternalLink className="w-3 h-3 text-ink-3 opacity-60 group-hover:opacity-100 shrink-0" aria-hidden="true" />
    </button>
  );
};

interface WorkspaceAssistantProps {
  activeDocument: StudyResource | null;
  onJumpToCitation: (resourceId: string, page?: number) => void;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    resourceId: string;
    resourceTitle: string;
    fileKind?: string;
    page?: number;
    score?: number;
  }>;
}

/** Separate thinking/reasoning blocks (<think>...</think>) from the clean markdown answer. */
function parseAssistantMessage(content: string): { thinking: string | null; answer: string } {
  if (!content) return { thinking: null, answer: '' };

  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const answer = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return {
      thinking: thinking.length > 0 ? thinking : null,
      answer
    };
  }

  // Handle unclosed <think> tag during generation / streaming
  const unclosedMatch = content.match(/<think>([\s\S]*)$/i);
  if (unclosedMatch) {
    return {
      thinking: unclosedMatch[1].trim() || null,
      answer: ''
    };
  }

  return { thinking: null, answer: content };
}

/**
 * Compact Thinking/Working indicator:
 * Shows ONLY a compact "Thinking..." indicator while generating.
 * Kept collapsed by default, with a subtle expand control for activity details.
 */
const CompactThinkingIndicator: React.FC<{
  scope: StudyScopeKind;
  activeDocTitle?: string;
  activeSubjectName?: string;
}> = ({ scope, activeDocTitle, activeSubjectName }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="py-0.5">
      <div className="inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse shrink-0" aria-hidden="true" />
        <span className="font-mono text-[11px] font-medium text-ink-2 select-none">Thinking...</span>
        <button
          type="button"
          onClick={() => setDetailsOpen((prev) => !prev)}
          className="p-0.5 text-ink-3 hover:text-ink transition-colors flex items-center justify-center border border-transparent hover:border-rule"
          title={detailsOpen ? 'Hide activity details' : 'Inspect activity details'}
          aria-expanded={detailsOpen}
          aria-label={detailsOpen ? 'Hide activity details' : 'Inspect activity details'}
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-150 ${detailsOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-2 p-2 border border-rule bg-paper-sunk font-mono text-[10.5px] text-ink-2 space-y-1 select-none animate-fadeIn">
          <div className="flex items-center justify-between gap-3 text-ink-3">
            <span className="uppercase tracking-wider text-[9.5px]">Scope</span>
            <span className="text-ink truncate max-w-[220px]">
              {scope === 'document'
                ? activeDocTitle || 'Current document'
                : scope === 'folder'
                  ? 'Current folder'
                  : scope === 'selected'
                    ? 'Selected resources'
                    : scope === 'subject'
                      ? activeSubjectName || 'Current subject'
                      : 'Entire library'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-ink-3">
            <span className="uppercase tracking-wider text-[9.5px]">Retrieval</span>
            <span className="text-ink">Grounded semantic search</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Collapsed-by-default container for thoughts or reasoning, keeping the final
 * answer separate, clean, and distraction-free.
 */
const ThoughtProcess: React.FC<{ thinking: string }> = ({ thinking }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-2.5 border border-rule bg-paper-sunk">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left p-1.5 px-2 flex items-center justify-between gap-2 font-mono text-[10px] text-ink-3 hover:text-ink transition-colors select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight
            className={`w-3 h-3 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
          <span className="uppercase tracking-wider font-semibold">Thought process</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-ink-3">
          {isOpen ? 'Hide' : 'Inspect'}
        </span>
      </button>

      {isOpen && (
        <div className="p-2.5 pt-1.5 border-t border-rule font-mono text-[11px] text-ink-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-paper">
          {thinking}
        </div>
      )}
    </div>
  );
};

export const WorkspaceAssistant: React.FC<WorkspaceAssistantProps> = ({
  activeDocument,
  onJumpToCitation
}) => {
  const {
    studyScope,
    setStudyScope,
    resources,
    subjects,
    semester,
    showToast
  } = useResources();

  const ownerKey = getOwnerKey();
  const ACTIVE_THREAD_KEY = `studysyncplus_active_thread_${ownerKey}`;
  const chatAction = useAction(api.rag.chat);
  const deleteThreadMut = useMutation(api.chat.deleteThread);

  const [threadId, setThreadIdState] = useState<string | null>(() => {
    try {
      const urlThread = new URLSearchParams(window.location.search).get('thread');
      if (urlThread) return urlThread;
      return localStorage.getItem(ACTIVE_THREAD_KEY);
    } catch {
      return null;
    }
  });

  const setThreadId = useCallback(
    (id: string | null) => {
      setThreadIdState(id);
      try {
        if (id) {
          localStorage.setItem(ACTIVE_THREAD_KEY, id);
        } else {
          localStorage.removeItem(ACTIVE_THREAD_KEY);
        }
      } catch {}
    },
    [ACTIVE_THREAD_KEY]
  );
  const [pending, setPending] = useState<{ userText: string } | null>(null);
  const [localReply, setLocalReply] = useState<{ userText: string; reply: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const persisted = useQuery(
    api.chat.listMessages,
    threadId ? { threadId: threadId as never } : 'skip'
  ) as
    | Array<{
        _id: string;
        role: 'user' | 'assistant';
        content: string;
        citations?: Array<{
          resourceId: string;
          resourceTitle: string;
          fileKind?: string;
          page?: number;
          score?: number;
        }>;
      }>
    | undefined;

  const threads = useQuery(api.chat.listThreads, { ownerKey });

  // Current subject derived from active document
  const activeSubject = useMemo(() => {
    if (!activeDocument) return null;
    return subjects.find((s) => s.id === activeDocument.subjectId) ?? null;
  }, [activeDocument, subjects]);

  // Count of documents in current subject
  const subjectDocsCount = useMemo(() => {
    if (!activeDocument) return 0;
    return resources.filter((r) => r.subjectId === activeDocument.subjectId).length;
  }, [activeDocument, resources]);

  // Turns list: persisted messages + optimistic pairs
  const turns: Turn[] = useMemo(() => {
    const base: Turn[] = (persisted ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      citations: m.citations?.map((c) => ({
        resourceId: c.resourceId,
        resourceTitle: c.resourceTitle,
        fileKind: c.fileKind,
        page: c.page,
        score: c.score
      }))
    }));

    if (pending) {
      base.push({ role: 'user', content: pending.userText });
      base.push({ role: 'assistant', content: '' });
      return base;
    }

    if (localReply && persisted && !persisted.some((m) => m.role === 'user' && m.content === localReply.userText)) {
      base.push({ role: 'user', content: localReply.userText });
      base.push({ role: 'assistant', content: localReply.reply });
    }

    return base;
  }, [persisted, pending, localReply]);

  // Auto-scroll transcript on new turn
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turns.length, pending]);

  // Dynamic suggested prompts based on scope
  const suggestedPrompts = useMemo((): string[] => {
    if (studyScope === 'document' && activeDocument) {
      return [
        'Summarize this document into high-yield exam bullet points.',
        'Show the key algorithm or process in a step-by-step trace table.',
        'What are the 5 most likely exam questions from this material?'
      ];
    }
    if (studyScope === 'subject' && activeSubject) {
      return [
        `What are the most heavily weighted topics in ${activeSubject.name}?`,
        `Give me a comparison table of key concepts across ${activeSubject.name}.`,
        `Draft a 3-day revision strategy for the ${activeSubject.name} exam.`
      ];
    }
    return [
      'Give me an exam-week revision schedule across all my subjects.',
      'Which subject should I prioritize based on credits and topics?',
      'Summarize the core concepts covered across my semester materials.'
    ];
  }, [studyScope, activeDocument, activeSubject]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      setError(null);
      setDraft('');
      setPending({ userText: trimmed });

      const args: Record<string, unknown> = {
        ownerKey,
        message: trimmed
      };

      if (threadId) {
        args.threadId = asResourceId(threadId);
      }

      // Map scope to Convex retrieval mode
      if (studyScope === 'document' && activeDocument) {
        args.mode = 'resource';
        args.resourceId = asResourceId(activeDocument.id);
      } else if (studyScope === 'folder' && activeDocument?.folderId) {
        args.mode = 'folder';
        args.folderId = asFolderId(activeDocument.folderId);
        args.subjectId = asSubjectId(activeDocument.subjectId);
      } else if (studyScope === 'subject' && activeDocument) {
        args.mode = 'subject';
        args.subjectId = asSubjectId(activeDocument.subjectId);
      } else {
        args.mode = 'semester';
        if (semester) {
          args.semesterId = asSemesterId(semester.id);
        }
      }

      try {
        const result = (await chatAction(args as never)) as { threadId: string; reply: string };
        setThreadId(result.threadId);
        setLocalReply({ userText: trimmed, reply: result.reply });
        if (!result.reply || result.reply.trim().length === 0) {
          setError('The assistant returned an empty answer. Please try rephrasing your question.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The assistant could not be reached. Please check your connection.');
      } finally {
        setPending(null);
      }
    },
    [pending, threadId, ownerKey, studyScope, activeDocument, semester, chatAction, setThreadId]
  );

  const startNewChat = () => {
    setThreadId(null);
    setPending(null);
    setLocalReply(null);
    setError(null);
    setHistoryOpen(false);
    composerRef.current?.focus();
  };

  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteThreadMut({ threadId: asThreadId(id), ownerKey });
      if (threadId === id) {
        startNewChat();
      }
      showToast('Study session deleted');
    } catch {
      showToast('Could not delete session');
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  // Honest context text for active scope
  const honestyInfo = useMemo(() => {
    if (studyScope === 'document') {
      if (!activeDocument) return 'No document selected.';
      const chunks = activeDocument.chunkCount ?? 0;
      return `Searching: "${activeDocument.title}" (${chunks} indexed chunks)`;
    }
    if (studyScope === 'folder') {
      return `Searching: Materials in current folder`;
    }
    if (studyScope === 'selected') {
      return `Searching: Selected materials`;
    }
    if (studyScope === 'subject') {
      const name = activeSubject?.name ?? activeDocument?.subjectName ?? 'Current Subject';
      return `Searching: All ${subjectDocsCount} materials in ${name}`;
    }
    return `Searching: Entire ${semester?.label ?? 'Semester III'} academic library`;
  }, [studyScope, activeDocument, activeSubject, subjectDocsCount, semester]);

  return (
    <div className="flex flex-col h-full bg-paper select-text">
      {/* Sidebar Header & Scope Selector */}
      <div className="border-b border-ink bg-paper shrink-0">
        <div className="p-3 sm:p-3.5 pb-2.5 flex items-center justify-between gap-2 border-b border-rule">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
              <Sparkles className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-ink leading-tight tracking-tight uppercase font-mono">
                Study Assistant
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={startNewChat}
              className="btn btn-ghost px-2 py-1 text-[11px] font-mono"
              title="Start a new chat session"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className={`btn btn-ghost px-2 py-1 text-[11px] font-mono ${historyOpen ? 'bg-paper-sunk text-ink' : ''}`}
              title="Past study conversations"
              aria-label="Past conversations"
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        {/* Context Scope Selector */}
        <div className="px-3 py-2 bg-paper-sunk">
          <div className="flex items-center gap-1 bg-paper border border-rule p-0.5">
            <button
              onClick={() => setStudyScope('document')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[11px] font-mono font-semibold transition-colors ${
                studyScope === 'document'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Scope AI search to the currently opened document only"
            >
              <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">This Doc</span>
            </button>

            {activeDocument?.folderId && (
              <button
                onClick={() => setStudyScope('folder')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[11px] font-mono font-semibold transition-colors ${
                  studyScope === 'folder'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink-2 hover:text-ink hover:bg-paper-sunk'
                }`}
                title="Scope AI search across all materials in this document's folder"
              >
                <FolderIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">Folder</span>
              </button>
            )}

            <button
              onClick={() => setStudyScope('subject')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[11px] font-mono font-semibold transition-colors ${
                studyScope === 'subject'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Scope AI search across all PDFs and materials in this subject"
            >
              <Layers className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Subject</span>
            </button>

            <button
              onClick={() => setStudyScope('library')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 text-[11px] font-mono font-semibold transition-colors ${
                studyScope === 'library'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-sunk'
              }`}
              title="Scope AI search across the entire semester academic library"
            >
              <Library className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Library</span>
            </button>
          </div>

          {/* Context Honesty Indicator */}
          <div className="flex items-center gap-1.5 mt-1.5 px-0.5 text-[10.5px] font-mono text-ink-3">
            <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" aria-hidden="true" />
            <span className="truncate" title={honestyInfo}>
              {honestyInfo}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions History Drawer / Popover */}
      {historyOpen && (
        <div className="border-b border-ink bg-paper p-3 max-h-56 overflow-y-auto animate-fadeIn shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 font-semibold">
              Recent Sessions ({threads?.length ?? 0})
            </span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-[11px] font-mono text-ink-2 hover:text-ink"
            >
              Close
            </button>
          </div>
          {threads === undefined || threads.length === 0 ? (
            <p className="text-xs text-ink-3 py-2 text-center">No past study sessions found.</p>
          ) : (
            <div className="space-y-1">
              {threads.map((t) => (
                <div
                  key={t._id}
                  onClick={() => {
                    setThreadId(t._id);
                    setHistoryOpen(false);
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 border transition-colors cursor-pointer group ${
                    threadId === t._id
                      ? 'border-ink bg-lime/10'
                      : 'border-rule hover:border-ink hover:bg-paper-sunk'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{t.title}</p>
                    <p className="text-[10px] font-mono text-ink-3 mt-0.5">
                      {new Date(t.updatedAt).toLocaleDateString()} · {t.mode.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => void handleDeleteThread(t._id, e)}
                    className="p-1 text-ink-3 opacity-0 group-hover:opacity-100 hover:text-alert transition-opacity shrink-0"
                    title="Delete session"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transcript Area */}
      <div ref={transcriptRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6 sm:space-y-7 bg-paper">
        {turns.length === 0 ? (
          <div className="py-6 sm:py-8 text-center">
            <div className="w-10 h-10 bg-lime/20 border border-lime flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-lime-deep" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-ink mb-1">Grounded Academic Assistant</h3>
            <p className="text-xs text-ink-2 max-w-[32ch] mx-auto mb-5 leading-relaxed">
              Ask anything about this document, related subjects, or past papers. Every answer is strictly grounded with page and slide citations.
            </p>

            <div className="text-left space-y-1.5 max-w-sm mx-auto">
              <span className="block text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 mb-1">
                Suggested prompts:
              </span>
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => void send(prompt)}
                  className="w-full text-left p-2.5 bg-paper-sunk border border-rule hover:border-ink text-xs text-ink transition-colors flex items-center justify-between gap-2 group"
                >
                  <span className="leading-snug">{prompt}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, idx) => {
            const isUser = turn.role === 'user';
            const isPendingAssistant = !isUser && !turn.content && pending !== null && idx === turns.length - 1;

            if (isUser) {
              return (
                <div
                  key={idx}
                  className="flex flex-col items-end animate-fadeIn pl-6 sm:pl-10"
                >
                  {/* User label */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-3">
                      You
                    </span>
                  </div>

                  {/* Distinct user query bubble */}
                  <div className="max-w-[88%] sm:max-w-[80%] px-3.5 py-2.5 bg-ink text-paper border border-ink text-xs sm:text-[13px] leading-relaxed font-sans shadow-none">
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="w-full flex flex-col items-start animate-fadeIn pt-1"
              >
                {/* Assistant speaker line */}
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" aria-hidden="true" />
                  <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider text-ink-2">
                    StudySync AI
                  </span>
                </div>

                {/* Seamless message body: full width, directly on background, no card/border/shadow */}
                <div className="w-full text-ink leading-relaxed">
                  {isPendingAssistant ? (
                    <CompactThinkingIndicator
                      scope={studyScope}
                      activeDocTitle={activeDocument?.title}
                      activeSubjectName={activeSubject?.name}
                    />
                  ) : (
                    <div>
                      {(() => {
                        const { thinking, answer } = parseAssistantMessage(turn.content);
                        return (
                          <>
                            {thinking && <ThoughtProcess thinking={thinking} />}
                            {answer ? (
                              <MarkdownRenderer content={answer} />
                            ) : (
                              <CompactThinkingIndicator
                                scope={studyScope}
                                activeDocTitle={activeDocument?.title}
                                activeSubjectName={activeSubject?.name}
                              />
                            )}
                          </>
                        );
                      })()}

                      {/* Clickable Grounded Citations */}
                      {turn.citations && turn.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-rule/70">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 font-semibold">
                              Grounded Sources ({turn.citations.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {turn.citations.map((c, ci) => (
                              <CitationChip
                                key={ci}
                                resourceTitle={c.resourceTitle}
                                page={c.page}
                                fileKind={c.fileKind}
                                isActiveDoc={activeDocument?.id === c.resourceId}
                                onOpen={() => onJumpToCitation(c.resourceId, c.page)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-3 bg-paper border border-alert text-alert text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => composerRef.current?.focus()}
                className="mt-1 text-[11px] underline font-mono text-ink hover:text-alert"
              >
                Try rephrasing your question
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Composer Area */}
      <div className="p-3 border-t border-ink bg-paper shrink-0">
        <div className="relative border border-ink bg-paper focus-within:border-ink focus-within:ring-1 focus-within:ring-ink transition-shadow">
          <textarea
            ref={composerRef}
            rows={2}
            value={draft}
            disabled={pending !== null}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              studyScope === 'document'
                ? `Ask about "${activeDocument?.title?.slice(0, 30) ?? 'this doc'}…" (Enter to send)`
                : studyScope === 'subject'
                  ? `Ask about all materials in ${activeSubject?.name ?? 'this subject'}…`
                  : 'Ask across the entire academic library…'
            }
            className="w-full p-2.5 pr-10 text-xs bg-transparent border-none outline-none resize-none placeholder:text-ink-3 text-ink leading-snug font-sans disabled:opacity-50"
          />
          <button
            onClick={() => void send(draft)}
            disabled={pending !== null || !draft.trim()}
            className="absolute right-2 bottom-2 w-7 h-7 bg-ink text-paper hover:bg-lime hover:text-ink disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors"
            title="Send query (Enter)"
            aria-label="Send query"
          >
            {pending ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="font-mono text-[9.5px] text-ink-3 mt-1.5 flex items-center justify-between">
          <span>Enter to send · Shift+Enter for new line</span>
          <span className="hidden sm:inline">NVIDIA Nemotron 30B & Nemotron 1B Embeddings</span>
        </p>
      </div>
    </div>
  );
};
