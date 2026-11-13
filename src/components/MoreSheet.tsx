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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 animate-fadeIn"
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
        className="ruled w-full max-w-5xl max-h-[92vh] flex flex-col shadow-overlay animate-fadeIn bg-paper"
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-7 py-4 border-b border-ink shrink-0">
          <div className="min-w-0">
            <h2 id="more-sheet-title" className="text-lg font-extrabold text-ink leading-tight tracking-tight">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-ink-2 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost px-2 shrink-0" aria-label="Close">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">{children}</div>
      </div>
    </div>
  );
};
