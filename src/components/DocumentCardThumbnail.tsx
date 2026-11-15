import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { asResourceId } from '../lib/convexIds';
import type { StudyResource } from '../types';
import { getStaticPdfUrl } from '../lib/staticMaterials';
import { pdfjsLib, getSharedPdfWorker } from '../lib/pdfjsWorker';

// In-memory cache so rendered thumbnails are instantaneous when navigating or switching views
const THUMBNAIL_DATA_CACHE = new Map<string, string>();

interface DocumentCardThumbnailProps {
  resource: StudyResource;
  index?: number;
}

export const DocumentCardThumbnail: React.FC<DocumentCardThumbnailProps> = ({ resource, index: _index }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Check if resource has a server-stored file in Convex
  const isServerId = Boolean(
    resource &&
    resource.hasFile &&
    !resource.id.startsWith('res-') &&
    resource.id.length > 10
  );

  // Fetch real file URL from Convex Storage
  const fileData = useQuery(
    api.resources.fileUrl,
    isServerId ? { id: asResourceId(resource.id) } : 'skip'
  );

  const staticPdfUrl = useMemo(() => getStaticPdfUrl(resource), [resource]);
  const pdfUrl = fileData?.url || staticPdfUrl || ((resource as any).fileUrl as string | undefined) || null;

  const cacheKey = pdfUrl || resource.id || resource.title;
  const cachedUrl = THUMBNAIL_DATA_CACHE.get(cacheKey) || null;
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);
  const [loadedThumbUrl, setLoadedThumbUrl] = useState<string | null>(null);

  if (prevCacheKey !== cacheKey) {
    setPrevCacheKey(cacheKey);
    setLoadedThumbUrl(null);
  }

  const thumbUrl = cachedUrl || loadedThumbUrl;

  // Lazy observation
  useEffect(() => {
    if (thumbUrl) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          }
        });
      },
      {
        rootMargin: '300px 0px 300px 0px',
        threshold: 0
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbUrl]);

  // PDF.js render real original page 1 to canvas dataURL
  useEffect(() => {
    if (!inView || thumbUrl || !pdfUrl) return;

    let cancelled = false;

    const renderFirstPage = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          worker: getSharedPdfWorker()
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        if (cancelled) return;

        // Render at a crisp thumbnail resolution (~360px wide)
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 360;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const renderTask = page.render({
          canvasContext: ctx,
          canvas,
          viewport
        });

        await renderTask.promise;
        if (cancelled) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        THUMBNAIL_DATA_CACHE.set(cacheKey, dataUrl);
        setLoadedThumbUrl(dataUrl);
      } catch {
        // Keeps the clean academic document sheet fallback
      }
    };

    void renderFirstPage();

    return () => {
      cancelled = true;
    };
  }, [inView, thumbUrl, pdfUrl, cacheKey]);

  // Clean document title for fallback display
  const displayTitle = useMemo(() => {
    const raw = resource.fileName || resource.title || 'Course Material';
    return raw.replace(/\.pdf$/i, '').trim();
  }, [resource.title, resource.fileName]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[16/10] rounded-xl overflow-hidden border-2 border-gray-800 bg-white relative select-none shadow-2xs group-hover:shadow-md transition-all flex items-center justify-center"
    >
      {thumbUrl ? (
        /* Real OG Scanned/Rendered Page 1 of the Document */
        <img
          src={thumbUrl}
          alt={resource.title}
          className="w-full h-full object-cover object-top block transition-opacity duration-200"
          loading="lazy"
        />
      ) : (
        /* Clean Authentic SAKEC Academic Document Cover (OG format) */
        <div className="w-full h-full bg-white p-2.5 sm:p-3 flex flex-col justify-between text-gray-900 select-none">
          {/* Official College Header */}
          <div className="text-center border-b pb-1.5 border-gray-200">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <div className="w-4 h-4 rounded-sm border border-blue-900 bg-blue-50 text-blue-900 flex items-center justify-center text-[9px] font-bold">
                ⚓
              </div>
              <span className="font-extrabold text-[10px] uppercase text-blue-950 tracking-tight truncate">
                Shah &amp; Anchor Kutchhi Engg. College
              </span>
            </div>
            <p className="text-[7.5px] font-mono text-gray-500 uppercase tracking-wider">
              Autonomous Institute • Department of Computer Engineering
            </p>
          </div>

          {/* Academic Metadata Grid (matching Image 2) */}
          <div className="border border-gray-800 rounded text-[8px] font-mono my-1 overflow-hidden">
            <div className="grid grid-cols-2 border-b border-gray-300 bg-gray-50 px-1.5 py-0.5 font-bold text-gray-800">
              <span className="truncate">Course: {resource.subjectName || resource.courseCode}</span>
              <span className="text-right truncate">Sem: III · SYCM1</span>
            </div>
            <div className="grid grid-cols-2 px-1.5 py-0.5 text-gray-600">
              <span className="truncate">Code: {resource.courseCode}</span>
              <span className="text-right truncate">Roll: {resource.rollNumber || '68'}</span>
            </div>
          </div>

          {/* Document / Experiment Title Box */}
          <div className="border border-gray-800 rounded bg-neutral-50 p-1.5 my-auto">
            <span className="text-[8px] font-black uppercase text-red-600 block">
              {(resource as any).folderName || resource.type || 'Course Material'}
            </span>
            <h5 className="font-extrabold text-[11px] text-gray-900 line-clamp-2 leading-tight">
              {displayTitle}
            </h5>
          </div>

          {/* Bottom Footer Info */}
          <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 pt-1 border-t border-gray-200">
            <span className="font-bold text-blue-950">A.Y. 2026-2027</span>
            <span className="bg-gray-100 px-1 rounded font-bold text-gray-700">{resource.fileSize}</span>
          </div>
        </div>
      )}
    </div>
  );
};
