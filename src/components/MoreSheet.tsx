import React from 'react';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import { X } from 'lucide-react';

interface MoreSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Large sheet hosting the demoted secondary features (analytics, async lab,
 * scheme, syllabus map). They keep their inner components untouched.
 */
export const MoreSheet: React.FC<MoreSheetProps> = ({ title, subtitle, onClose, children }) => {
  const panelRef = useOverlayBehavior(true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border-2 border-slate-900 rounded-2xl shadow-[6px_6px_0px_#0f172a] animate-fadeIn overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-7 py-4 bg-yellow-400 border-b-2 border-slate-900 shrink-0">
          <div className="min-w-0">
            <h2 id="more-sheet-title" className="text-lg font-black text-slate-900 leading-tight tracking-tight">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-800 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-900 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 bg-[#f8fafc]">{children}</div>
      </div>
    </div>
  );
};
