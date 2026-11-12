import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
            <div className="w-3.5 h-1 bg-lime" />
          </div>
          <span className="font-extrabold text-base text-ink tracking-tight leading-none whitespace-nowrap">
            StudySyncPlus
          </span>
          <span className="text-xs text-ink-3 truncate">Semester III course file · SAKEC</span>
        </div>

        <p className="text-xs text-ink-3 sm:text-right shrink-0">
          Tanmay Shinde (67) · Aditya Shah (68) — Web Computing &amp; Modern Frameworks
        </p>
      </div>
    </footer>
  );
};
