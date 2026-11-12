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
  ExternalLink,
  Code2,
  Cpu
} from 'lucide-react';

export const JsSandboxModal: React.FC = () => {
  const { resources, userProfile } = useResources();

  // 1. Fetch API State
  const [bookQuery, setBookQuery] = useState('Data Structures');
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [isFetchingBooks, setIsFetchingBooks] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  // 2. Promise Chaining State
  const [chainLogs, setChainLogs] = useState<string[]>([]);
  const [isRunningChain, setIsRunningChain] = useState(false);

  // 3. Error Handling State
  const [errorLog, setErrorLog] = useState<{ status: 'idle' | 'success' | 'caught'; message: string }>({
    status: 'idle',
    message: 'Click button to trigger asynchronous error-handling demo.'
  });

  // 4. Storage Inspector
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

  // Run live OpenLibrary Fetch API (CO2.2, CO2.6)
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

  // Run Promise Chaining (CO2.5)
  const handleRunPromiseChain = async () => {
    setIsRunningChain(true);
    setChainLogs(['[Init] Starting 3-stage asynchronous promise chain...']);

    const result = await apiService.simulatePromiseChaining('Distributed Operating Systems Lab');
    setChainLogs((prev) => [...prev, result]);
    setIsRunningChain(false);
  };

  // Run deliberate error catch (CO1.5)
  const handleTriggerError = async () => {
    try {
      setErrorLog({ status: 'idle', message: 'Initiating request with potential 503 error...' });
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
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="clay-box p-6 sm:p-8 bg-gradient-to-r from-white via-cyan-50/20 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-cyan-100 text-cyan-800 rounded-lg">
                Module 1 (CO1) & Module 2 (CO2)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Live Interactive Lab & JavaScript Engine Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Async JS, Fetch API & Storage Sandbox
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Test and demonstrate live client-server communication, Promise chaining, CORS principles, and browser storage.
            </p>
          </div>

          <div className="clay-badge px-4 py-2 bg-white rounded-2xl flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Runtime</p>
              <p className="text-xs font-extrabold text-slate-800">V8 / ES6+ Async</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Interactive Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Live Fetch API & External REST API */}
        <div className="clay-box p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Live REST API Fetch (OpenLibrary)</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                CO2.2, CO2.6
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Executes a non-blocking asynchronous Fetch API call to the OpenLibrary REST search endpoint without reloading the page.
            </p>

            <form onSubmit={handleFetchBooks} className="flex gap-2 mb-4">
              <input
                type="text"
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Search subject (e.g. Operating Systems)"
                className="flex-1 px-3 py-2 clay-input text-xs sm:text-sm text-slate-800"
              />
              <button
                type="submit"
                disabled={isFetchingBooks}
                className="clay-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {isFetchingBooks ? 'Fetching...' : 'Fetch JSON'}
              </button>
            </form>

            {apiLatency !== null && (
              <p className="text-[11px] text-emerald-600 font-mono mb-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Response parsed in {apiLatency} ms (200 OK)
              </p>
            )}

            {/* Results Output */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {books.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                  Click "Fetch JSON" to retrieve academic publications via REST API.
                </div>
              ) : (
                books.map((b, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-bold text-slate-800">{b.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Author: {b.author_name?.slice(0, 2).join(', ')} • Published: {b.first_publish_year}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2. Promise Chaining Demonstration */}
        <div className="clay-box p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Promise Chaining (.then() Pipeline)</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                CO2.4, CO2.5
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Demonstrates asynchronous Promise chaining where sequential promises pass results downstream without callback hell.
            </p>

            <button
              onClick={handleRunPromiseChain}
              disabled={isRunningChain}
              className="clay-button px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-2 mb-4"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>{isRunningChain ? 'Executing Chain...' : 'Run Promise Pipeline'}</span>
            </button>

            {/* Console Log Display */}
            <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs space-y-1.5 min-h-[140px] max-h-56 overflow-y-auto">
              <p className="text-slate-500 text-[10px]">// Pipeline Console Stream</p>
              {chainLogs.length === 0 ? (
                <p className="text-slate-600">// Awaiting promise execution trigger...</p>
              ) : (
                chainLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed">
                    ➔ {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. Error Handling & Debugging Techniques */}
        <div className="clay-box p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800">Error Handling & Try / Catch</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                CO1.5
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Demonstrates resilient client-side error handling by trapping simulated server network failures and parsing error stacks.
            </p>

            <button
              onClick={handleTriggerError}
              className="clay-button px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 flex items-center gap-2 mb-4"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Simulate 503 Network Error</span>
            </button>

            <div
              className={`p-4 rounded-xl text-xs font-mono border ${
                errorLog.status === 'caught'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="font-bold mb-1">State: {errorLog.status.toUpperCase()}</p>
              <p className="break-all">{errorLog.message}</p>
            </div>
          </div>
        </div>

        {/* 4. LocalStorage & SessionStorage API Inspector */}
        <div className="clay-box p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Client Storage Inspector</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                  CO1.4
                </span>
                <button
                  onClick={refreshStorage}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title="Refresh keys"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Live inspection of items stored in browser's persistent <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">localStorage</code>:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {storageKeys.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-mono font-bold text-indigo-600">{item.key}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">{item.size}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Saved Bookmarks: <strong>{userProfile.savedResourceIds.length}</strong></span>
              <span>Loaded Resources: <strong>{resources.length}</strong></span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. CORS & Architecture Explainer (CO2.7) */}
      <div className="clay-box p-6 bg-white">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Code2 className="w-4 h-4 text-indigo-600" />
          Syllabus Architecture Note: Cross-Origin Resource Sharing (CORS)
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          When frontend Single Page Applications communicate with remote APIs (e.g. OpenLibrary or college servers), modern browsers enforce the Same-Origin Policy. To permit cross-origin requests, servers respond with HTTP headers such as <code className="font-mono bg-slate-100 text-indigo-600 px-1 py-0.5 rounded">Access-Control-Allow-Origin: *</code>. In StudySyncPlus, public endpoints are accessed with CORS headers, while internal resource state is safely managed via React Context and browser storage.
        </p>
      </div>
    </div>
  );
};
