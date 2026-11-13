import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useResources } from '../context/ResourceContext';
import { getOwnerKey } from '../lib/owner';
import { asResourceId, asSubjectId, asSemesterId } from '../lib/convexIds';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Sparkles,
  Send,
  PlusCircle,
  History,
  Trash2,
  FileText,
  Presentation,
  LoaderCircle
} from 'lucide-react';

/** One rendered chat turn. Persisted turns come from Convex; in-flight ones are local. */
interface Turn {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    resourceId: string;
    resourceTitle: string;
    fileKind?: string;
    page?: number;
  }>;
}

interface CitationChipProps {
  resourceTitle: string;
  page?: number;
  fileKind?: string;
  onOpen: () => void;
}

/** "MSE Guide · Page 28" / "Unit 2 Deck · Slide 5" — click opens the document. */
const CitationChip: React.FC<CitationChipProps> = ({ resourceTitle, page, fileKind, onOpen }) => {
  const isDeck = fileKind === 'ppt' || fileKind === 'pptx';
  return (
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-1 px-2 py-0.5 border border-rule bg-paper text-ink-2 font-mono text-[10.5px] hover:border-ink hover:text-ink transition-colors max-w-full"
      title={`Open ${resourceTitle}${page ? (isDeck ? ` at slide ${page}` : ` at page ${page}`) : ''}`}
    >
      {isDeck ? <Presentation className="w-3 h-3 shrink-0" aria-hidden="true" /> : <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span className="truncate max-w-[180px]">{resourceTitle}</span>
      {page ? <span className="text-lime-text font-semibold shrink-0">· {isDeck ? 'Slide' : 'Page'} {page}</span> : null}
    </button>
  );
};

const SENDER_GREETING: Turn = {
  role: 'assistant',
  content: 'Ask anything from your course file — I answer from your own PDFs and decks, with page and slide references.'
};

export const AssistantPanel: React.FC = () => {
  const {
    assistantScope,
    openAssistant,
    openDetail,
    subjects,
    resources,
    semester,
    showToast
  } = useResources();
  const ownerKey = getOwnerKey();

  const chatAction = useAction(api.rag.chat);
  const deleteThreadMut = useMutation(api.chat.deleteThread);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ userText: string } | null>(null);
  /** Reply shown locally until the persisted copy arrives through the live query. */
  const [localReply, setLocalReply] = useState<{ userText: string; reply: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Live data for the current thread (source of truth once a thread exists).
  const persisted = useQuery(
    api.chat.listMessages,
    threadId ? { threadId: threadId as never } : 'skip'
  ) as
    | Array<{
        _id: string;
        role: 'user' | 'assistant';
        content: string;
        citations?: Array<{ resourceId: string; resourceTitle: string; fileKind?: string; page?: number }>;
      }>
    | undefined;

  const threads = useQuery(api.chat.listThreads, { ownerKey });

  // A scope change starts a clean thread — context defines the conversation.
  const scopeKey = useMemo(
    () =>
      assistantScope.mode === 'semester'
        ? 'semester'
        : assistantScope.mode === 'subject'
          ? `subject:${assistantScope.subjectId}`
          : `resource:${assistantScope.resourceId}`,
    [assistantScope]
  );

  useEffect(() => {
    setThreadId(null);
    setPending(null);
    setLocalReply(null);
    setError(null);
    composerRef.current?.focus();
  }, [scopeKey]);

  // Scope label for the context selector.
  const scopeOptions = useMemo(() => {
    const options: Array<{ key: string; label: string }> = [];
    if (semester) {
      options.push({ key: 'semester', label: `All ${semester.label} documents` });
    } else {
      options.push({ key: 'semester', label: 'All semester documents' });
    }
    for (const subject of subjects) {
      options.push({ key: `subject:${subject.id}`, label: subject.name });
    }
    if (assistantScope.mode === 'resource') {
      const resource = resources.find((r) => r.id === assistantScope.resourceId);
      if (resource) {
        options.push({ key: `resource:${resource.id}`, label: `This document: ${resource.title}` });
      }
    }
    return options;
  }, [semester, subjects, assistantScope, resources]);

  const currentKey = scopeKey;
  const scopeLabel = scopeOptions.find((o) => o.key === currentKey)?.label ?? 'All semester documents';

  const switchScope = (key: string) => {
    if (key === 'semester') {
      openAssistant({ mode: 'semester' });
      return;
    }
    if (key.startsWith('subject:')) {
      openAssistant({ mode: 'subject', subjectId: key.slice(8) });
      return;
    }
    if (key.startsWith('resource:')) {
      openAssistant({ mode: 'resource', resourceId: key.slice(9) });
      return;
    }
  };

  // Turns to render: persisted turns (if any) + local in-flight pair.
  const turns: Turn[] = useMemo(() => {
    const base: Turn[] = (persisted ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      citations: m.citations?.map((c) => ({
        resourceId: c.resourceId,
        resourceTitle: c.resourceTitle,
        fileKind: c.fileKind,
        page: c.page
      }))
    }));

    // While the assistant is working: optimistic user turn + busy indicator.
    if (pending) {
      base.push({ role: 'user', content: pending.userText });
      base.push({ role: 'assistant', content: '' });
      return base;
    }

    // Just after the answer: show it locally until the live query catches up.
    if (localReply && persisted && !persisted.some((m) => m.role === 'user' && m.content === localReply.userText)) {
      base.push({ role: 'user', content: localReply.userText });
      base.push({ role: 'assistant', content: localReply.reply });
    }
    return base;
  }, [persisted, pending, localReply]);

  // Drop the local reply once the persisted transcript includes it.
  useEffect(() => {
    if (!localReply || !persisted) return;
    if (persisted.some((m) => m.role === 'user' && m.content === localReply.userText)) {
      setLocalReply(null);
    }
  }, [persisted, localReply]);

  // Keep the latest turn in view.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, pending]);

  const suggestedPrompts = useMemo((): string[] => {
    if (assistantScope.mode === 'resource') {
      return [
        'Summarize this document in key points.',
        'What are the most important definitions or formulas here?',
        'Make 5 likely exam questions from this document.'
      ];
    }
    if (assistantScope.mode === 'subject') {
      const subject = subjects.find((s) => s.id === assistantScope.subjectId);
      return [
        `What topics do my ${subject?.name ?? 'subject'} materials cover?`,
        `Explain the key concepts from the ${subject?.name ?? 'subject'} notes.`,
        `Give me a revision plan for the ${subject?.name ?? 'subject'} internal.`
      ];
    }
    return [
      'Give me a quick revision plan for the internal exams.',
      'Which subject should I prioritize this week?',
      'Summarize the key topics across my materials.'
    ];
  }, [assistantScope, subjects]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      setError(null);
      setDraft('');
      setPending({ userText: trimmed });

      const args: Record<string, unknown> = { ownerKey, message: trimmed };
      if (threadId) args.threadId = asResourceId(threadId);
      if (assistantScope.mode === 'semester') {
        args.mode = 'semester';
        if (semester) args.semesterId = asSemesterId(semester.id);
      } else if (assistantScope.mode === 'subject') {
        args.mode = 'subject';
        args.subjectId = asSubjectId(assistantScope.subjectId);
      } else {
        args.mode = 'resource';
        args.resourceId = asResourceId(assistantScope.resourceId);
      }

      try {
        const result = (await chatAction(args as never)) as { threadId: string; reply: string };
        setThreadId(result.threadId);
        setLocalReply({ userText: trimmed, reply: result.reply });
        if (!result.reply || result.reply.trim().length === 0) {
          setError('The assistant returned an empty answer. Try rephrasing the question.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The assistant could not be reached. Please try again.');
      } finally {
        setPending(null);
      }
    },
    [pending, threadId, ownerKey, assistantScope, semester, chatAction]
  );

  const startNewChat = () => {
    setThreadId(null);
    setPending(null);
    setLocalReply(null);
    setError(null);
    setHistoryOpen(false);
    composerRef.current?.focus();
  };

  const openCitation = (resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (resource) openDetail(resource);
    else showToast('That document is no longer in the shelf.');
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  const emptyThread = turns.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] md:h-[calc(100vh-3.5rem)] animate-fadeIn">
      {/* Header: title + context selector + history */}
      <div className="border-b border-ink px-4 sm:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-lime" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[17px] font-extrabold text-ink leading-tight tracking-tight">Study Assistant</h1>
            <p className="font-mono text-[10.5px] text-ink-3 truncate">Answers come from your own documents</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 shrink-0 hidden sm:inline">Context</span>
            <select
              value={currentKey}
              onChange={(e) => switchScope(e.target.value)}
              aria-label="Assistant context"
              className="field w-full sm:w-64 px-2.5 py-1.5 text-[12px]"
            >
              {scopeOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button onClick={startNewChat} className="btn btn-secondary px-2.5" title="Start a new conversation">
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline text-[13px]">New</span>
          </button>

          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="btn btn-ghost px-2.5"
            title="Past conversations"
          >
            <History className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline text-[13px]">History</span>
          </button>
        </div>
      </div>

      {/* History drawer (inline strip) */}
      {historyOpen && (
        <div className="border-b border-rule bg-paper-sunk px-4 sm:px-8 py-3 animate-fadeIn max-h-56 overflow-y-auto">
          {!threads || threads.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-3">No past conversations yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {threads.map((t: { _id: string; title: string; updatedAt: number }) => (
                <li key={t._id} className="flex items-center justify-between gap-2 py-1.5">
                  <button
                    onClick={() => {
                      setThreadId(t._id);
                      setHistoryOpen(false);
                    }}
                    className="min-w-0 text-left group"
                  >
                    <span className="block text-[13px] font-semibold text-ink truncate group-hover:underline underline-offset-2">
                      {t.title}
                    </span>
                    <span className="block font-mono text-[10px] text-ink-3">
                      {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                      {new Date(t.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      void deleteThreadMut({ threadId: t._id as never, ownerKey }).then(() => {
                        if (threadId === t._id) setThreadId(null);
                      });
                    }}
                    className="p-1.5 text-ink-3 hover:text-alert transition-colors shrink-0"
                    aria-label={`Delete conversation "${t.title}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {emptyThread && (
            <div className="pt-6">
              <p className="text-[13px] text-ink-2 leading-relaxed">{SENDER_GREETING.content}</p>
              <div className="mt-6 space-y-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void send(prompt)}
                    className="w-full text-left ruled px-4 py-3 text-[13px] font-semibold text-ink hover:border-ink hover:bg-lime-wash/60 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[10.5px] text-ink-3 mt-5">
                Context: {scopeLabel}
              </p>
            </div>
          )}

          {turns.map((turn, index) =>
            turn.role === 'user' ? (
              <div key={index} className="flex justify-end">
                <div className="ruled-sunk max-w-[85%] px-4 py-3 text-[13px] text-ink whitespace-pre-wrap">
                  {turn.content}
                </div>
              </div>
            ) : (
              <div key={index} className="pl-3 border-l-2 border-lime">
                {turn.content ? (
                  <MarkdownRenderer content={turn.content} />
                ) : (
                  <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Searching your documents…
                  </p>
                )}
                {turn.citations && turn.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {turn.citations.map((citation, cIdx) => (
                      <CitationChip
                        key={cIdx}
                        resourceTitle={citation.resourceTitle}
                        page={citation.page}
                        fileKind={citation.fileKind}
                        onOpen={() => openCitation(citation.resourceId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {error && (
            <div className="ruled p-4 flex items-start gap-2.5" role="alert">
              <span className="w-1.5 h-1.5 bg-alert mt-1.5 shrink-0" aria-hidden="true" />
              <p className="text-[13px] text-ink">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-ink bg-paper px-4 sm:px-8 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={`Ask about ${scopeLabel.toLowerCase()}…`}
            aria-label="Message the Study Assistant"
            className="field flex-1 px-3.5 py-2.5 text-[13px] resize-none max-h-40"
            style={{ height: 'auto', minHeight: '2.75rem' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={() => void send(draft)}
            disabled={!draft.trim() || !!pending}
            className="btn btn-primary px-3.5 h-11"
            aria-label="Send question"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <p className="max-w-3xl mx-auto font-mono text-[10px] text-ink-3 mt-1.5">
          Enter to send · Shift+Enter for a new line{assistantScope.mode === 'resource' ? ' · answering from this document' : ''}
        </p>
      </div>
    </div>
  );
};
