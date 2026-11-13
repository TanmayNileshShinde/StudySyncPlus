import React, { useState } from 'react';
import { apiService, OpenLibraryBook } from '../services/apiService';
import { useResources } from '../context/ResourceContext';
import {
  Terminal,
  Globe,
  Database,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle,
  Code2,
  Cpu
} from 'lucide-react';

export const JsSandboxModal: React.FC = () => {
  const { resources, bookmarkCount } = useResources();

  // 1. Fetch API state
  const [bookQuery, setBookQuery] = useState('Data Structures');
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [isFetchingBooks, setIsFetchingBooks] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  // 2. Promise chaining state
  const [chainLogs, setChainLogs] = useState<string[]>([]);
  const [isRunningChain, setIsRunningChain] = useState(false);

  // 3. Error handling state
  const [errorLog, setErrorLog] = useState<{ status: 'idle' | 'success' | 'caught'; message: string }>({
    status: 'idle',
    message: 'Click the button to trigger the asynchronous error-handling demo.'
  });

  // 4. Storage inspector
  const [storageKeys, setStorageKeys] = useState<{ key: string; size: string }[]>(() => {
    return Object.keys(localStorage).map((k) => ({
      key: k,
      size: `${((localStorage.getItem(k)?.length || 0) / 1024).toFixed(2)} KB`
    }));
  });

  const refreshStorage = () => {
    setStorageKeys(
      Object.keys(localStorage).map((k) => ({
        key: k,
        size: `${((localStorage.getItem(k)?.length || 0) / 1024).toFixed(2)} KB`
      }))
    );
  };

  // Live OpenLibrary fetch (CO2.2, CO2.6)
  const handleFetchBooks = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsFetchingBooks(true);
    const start = performance.now();
    try {
      const results = await apiService.searchExternalAcademicBooks(bookQuery);
      setBooks(results);
      setApiLatency(Math.round(performance.now() - start));
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingBooks(false);
    }
  };

  // Promise chaining (CO2.5)
  const handleRunPromiseChain = async () => {
    setIsRunningChain(true);
    setChainLogs(['[Init] Starting 3-stage asynchronous promise chain…']);

    const result = await apiService.simulatePromiseChaining('Distributed Operating Systems Lab');
    setChainLogs((prev) => [...prev, result]);
    setIsRunningChain(false);
  };

  // Deliberate error catch (CO1.5)
  const handleTriggerError = async () => {
    try {
      setErrorLog({ status: 'idle', message: 'Initiating request with potential 503 error…' });
      await apiService.simulateNetworkError();
      setErrorLog({ status: 'success', message: 'Request unexpectedly succeeded.' });
    } catch (err: any) {
      setErrorLog({
        status: 'caught',
        message: `[TRY / CATCH CAUGHT]: ${err.message}`
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="border border-ink bg-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
            Async JS, Fetch API &amp; Storage Sandbox
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-[58ch]">
            Live client-server communication, promise chaining, CORS principles, and browser storage —{' '}
            <span className="font-mono text-[11px] text-ink-3">Module 1 (CO1) &amp; Module 2 (CO2)</span>
          </p>
        </div>

        <div className="ruled-sunk px-4 py-3 shrink-0">
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            Runtime
          </p>
          <p className="text-sm font-extrabold text-ink font-mono">V8 / ES6+ Async</p>
        </div>
      </section>

      {/* Interactive modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Fetch API */}
        <section className="ruled p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-bold text-ink flex items-center gap-2">
                <Globe className="w-4 h-4" aria-hidden="true" />
                Live REST API Fetch (OpenLibrary)
              </h2>
              <span className="stamp stamp-outline">CO2.2 · CO2.6</span>
            </div>

            <p className="text-xs text-ink-2 mb-4 max-w-[60ch]">
              Executes a non-blocking asynchronous Fetch API call to the OpenLibrary REST search
              endpoint without reloading the page.
            </p>

            <form onSubmit={handleFetchBooks} className="flex gap-2 mb-3">
              <input
                type="text"
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Search subject (e.g. Operating Systems)"
                aria-label="Book search query"
                className="field flex-1 px-3 py-2 text-xs sm:text-sm"
              />
              <button type="submit" disabled={isFetchingBooks} className="btn btn-primary px-4">
                {isFetchingBooks ? 'Fetching…' : 'Fetch JSON'}
              </button>
            </form>

            {apiLatency !== null && (
              <p className="text-[11px] text-lime-text font-mono mb-2 flex items-center gap-1.5 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                Response parsed in {apiLatency} ms (200 OK)
              </p>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {books.length === 0 ? (
                <div className="ruled-sunk p-4 text-center text-xs text-ink-3">
                  Run a search to retrieve academic publications via the REST API.
                </div>
              ) : (
                books.map((b, i) => (
                  <div key={i} className="ruled-sunk p-2.5 text-xs">
                    <p className="font-bold text-ink">{b.title}</p>
                    <p className="text-[11px] text-ink-2 font-mono mt-0.5">
                      {b.author_name?.slice(0, 2).join(', ')} · {b.first_publish_year}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 2. Promise chaining */}
        <section className="ruled p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-bold text-ink flex items-center gap-2">
                <Terminal className="w-4 h-4" aria-hidden="true" />
                Promise Chaining (.then() Pipeline)
              </h2>
              <span className="stamp stamp-outline">CO2.4 · CO2.5</span>
            </div>

            <p className="text-xs text-ink-2 mb-4 max-w-[60ch]">
              Demonstrates asynchronous promise chaining where sequential promises pass results
              downstream without callback hell.
            </p>

            <button
              onClick={handleRunPromiseChain}
              disabled={isRunningChain}
              className="btn btn-secondary mb-4"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isRunningChain ? 'Executing Chain…' : 'Run Promise Pipeline'}</span>
            </button>

            <div className="p-4 bg-ink text-paper font-mono text-xs space-y-1.5 min-h-[140px] max-h-56 overflow-y-auto">
              <p className="text-ink-3">// Pipeline Console Stream</p>
              {chainLogs.length === 0 ? (
                <p className="text-ink-3">// Awaiting promise execution trigger…</p>
              ) : (
                chainLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed text-lime">
                    ➔ {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3. Error handling */}
        <section className="ruled p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                Error Handling &amp; Try / Catch
              </h2>
              <span className="stamp stamp-outline">CO1.5</span>
            </div>

            <p className="text-xs text-ink-2 mb-4 max-w-[60ch]">
              Demonstrates resilient client-side error handling by trapping simulated server network
              failures and parsing error stacks.
            </p>

            <button onClick={handleTriggerError} className="btn btn-secondary mb-4">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simulate 503 Network Error</span>
            </button>

            <div
              className={`p-4 text-xs font-mono border ${
                errorLog.status === 'caught'
                  ? 'bg-paper border-alert text-alert'
                  : 'ruled-sunk text-ink-2'
              }`}
              role="status"
            >
              <p className="font-bold mb-1">State: {errorLog.status.toUpperCase()}</p>
              <p className="break-all">{errorLog.message}</p>
            </div>
          </div>
        </section>

        {/* 4. Storage inspector */}
        <section className="ruled p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-bold text-ink flex items-center gap-2">
                <Database className="w-4 h-4" aria-hidden="true" />
                Client Storage Inspector
              </h2>
              <div className="flex items-center gap-2">
                <span className="stamp stamp-outline">CO1.4</span>
                <button
                  onClick={refreshStorage}
                  className="p-1.5 text-ink-3 hover:text-ink transition-colors"
                  aria-label="Refresh storage keys"
                  title="Refresh keys"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="text-xs text-ink-2 mb-4">
              Live inspection of items stored in the browser's persistent{' '}
              <code className="font-mono text-ink bg-sunk px-1 py-0.5">localStorage</code>:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {storageKeys.map((item, idx) => (
                <div
                  key={idx}
                  className="ruled-sunk p-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-mono font-bold text-ink truncate mr-2">{item.key}</span>
                  <span className="text-[11px] font-mono text-ink-3 tabular shrink-0">{item.size}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs text-ink-2 tabular">
              <span>
                Saved Bookmarks: <strong className="text-ink font-mono">{bookmarkCount}</strong>
              </span>
              <span>
                Loaded Resources: <strong className="text-ink font-mono">{resources.length}</strong>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* 5. CORS note (CO2.7) */}
      <section className="ruled-sunk p-6">
        <h2 className="font-bold text-ink flex items-center gap-2 mb-2 text-sm sm:text-base">
          <Code2 className="w-4 h-4" aria-hidden="true" />
          Syllabus Architecture Note: Cross-Origin Resource Sharing (CORS)
        </h2>
        <p className="text-xs text-ink-2 leading-relaxed max-w-[75ch]">
          When frontend Single Page Applications communicate with remote APIs (e.g. OpenLibrary or
          college servers), modern browsers enforce the Same-Origin Policy. To permit cross-origin
          requests, servers respond with HTTP headers such as{' '}
          <code className="font-mono text-ink bg-paper border border-rule px-1 py-0.5">
            Access-Control-Allow-Origin: *
          </code>
          . In StudySyncPlus, public endpoints are accessed with CORS headers, while internal resource
          state is safely managed via React Context and browser storage.
        </p>
      </section>
    </div>
  );
};
