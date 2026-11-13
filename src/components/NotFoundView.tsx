import React from 'react';
import { useResources } from '../context/ResourceContext';
import { ArrowLeft, Compass } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const { openHome } = useResources();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center min-h-[70vh] bg-paper">
      <div className="border border-ink bg-paper p-8 sm:p-10 max-w-md w-full shadow-overlay">
        <div className="w-12 h-12 bg-paper-sunk border border-ink flex items-center justify-center mx-auto mb-4">
          <Compass className="w-6 h-6 text-ink" aria-hidden="true" />
        </div>

        <span className="stamp stamp-alert font-mono mb-3 inline-block">404 · Page Not Found</span>
        <h1 className="text-lg font-bold text-ink mb-2">Shelf location does not exist</h1>
        <p className="text-xs text-ink-2 mb-6 leading-relaxed">
          The requested URL does not match any subject, document, or feature in StudySyncPlus. Check the link or return to the main academic catalog.
        </p>

        <button onClick={openHome} className="btn btn-primary w-full justify-center">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to All Subjects</span>
        </button>
      </div>
    </div>
  );
};
