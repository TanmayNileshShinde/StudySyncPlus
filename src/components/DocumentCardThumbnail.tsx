import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { StudyResource } from '../types';
import { getStaticPdfUrl } from '../lib/staticMaterials';
import { pdfjsLib, getSharedPdfWorker } from '../lib/pdfjsWorker';

// In-memory cache so rendered thumbnails are instantaneous when navigating or switching views
const THUMBNAIL_DATA_CACHE = new Map<string, string>();

interface DocumentCardThumbnailProps {
  resource: StudyResource;
  index: number;
}

export const DocumentCardThumbnail: React.FC<DocumentCardThumbnailProps> = ({ resource, index }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => {
    const key = resource.id || resource.title;
    return THUMBNAIL_DATA_CACHE.get(key) || null;
  });

  const pdfUrl = useMemo(() => {
    return getStaticPdfUrl(resource) || ((resource as any).fileUrl as string | undefined) || null;
  }, [resource]);

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
        rootMargin: '250px 0px 250px 0px',
        threshold: 0
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbUrl]);

  // PDF.js render page 1 to dataURL
  useEffect(() => {
    if (!inView || thumbUrl || !pdfUrl) return;

    let cancelled = false;
    const cacheKey = resource.id || resource.title;

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

        // Render at a crisp thumbnail resolution (~280px wide)
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 320;
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        const renderTask = page.render({
          canvasContext: ctx,
          canvas,
          viewport
        });

        await renderTask.promise;
        if (cancelled) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        THUMBNAIL_DATA_CACHE.set(cacheKey, dataUrl);
        setThumbUrl(dataUrl);
      } catch (err: any) {
        // Fallback to styled SVG preview on load failure/CORS
      }
    };

    void renderFirstPage();

    return () => {
      cancelled = true;
    };
  }, [inView, thumbUrl, pdfUrl, resource.id, resource.title]);

  // Derived slide title and labels for styled slide cover preview
  const displayTitle = useMemo(() => {
    const raw = resource.title || resource.fileName || 'Course Material';
    return raw.replace(/\.pdf$/i, '').trim();
  }, [resource.title, resource.fileName]);

  const subjectHeading = useMemo(() => {
    return resource.subjectName || resource.courseCode || 'Shah & Anchor Kutchhi Engineering College';
  }, [resource.subjectName, resource.courseCode]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 bg-[#0d1b2a] relative select-none shadow-xs group-hover:border-gray-800 transition-colors"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={resource.title}
          className="w-full h-full object-cover object-top block transition-opacity duration-200"
          loading="lazy"
        />
      ) : (
        /* SAKEC Style Slide Deck Cover SVG matching ClassPost preview */
        <div className="w-full h-full relative overflow-hidden flex flex-col justify-between p-3 bg-gradient-to-br from-[#0c192c] via-[#0d1b2a] to-[#070e17] text-white">
          {/* Geometric Origami Polygons on Left (exact SAKEC slide design) */}
          <div className="absolute -left-2 top-0 bottom-0 w-16 pointer-events-none opacity-90 overflow-hidden">
            <svg viewBox="0 0 70 120" className="w-full h-full preserve-3d" preserveAspectRatio="none">
              <polygon points="0,0 45,35 0,70" fill="#15803d" />
              <polygon points="0,35 60,65 0,95" fill="#22c55e" />
              <polygon points="0,65 35,90 0,120" fill="#4ade80" opacity="0.8" />
              <polygon points="45,35 60,65 0,35" fill="#166534" opacity="0.6" />
            </svg>
          </div>

          {/* Top Row: Institution Emblem Accent */}
          <div className="flex items-center justify-between pl-10 relative z-10">
            <span className="text-[9px] font-extrabold tracking-wider uppercase text-red-400 truncate max-w-[170px]">
              {subjectHeading}
            </span>
            <div className="w-5 h-5 rounded-full border border-amber-300/40 bg-amber-400/10 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-bold text-amber-300">🏛</span>
            </div>
          </div>

          {/* Center Content: Module & Topic Title */}
          <div className="pl-10 my-auto relative z-10">
            <div className="text-[10px] font-extrabold uppercase tracking-wide text-red-500 mb-0.5">
              {(resource as any).folderName || 'Module 1'}
            </div>
            <h5 className="font-extrabold text-[12px] sm:text-[13px] leading-snug text-amber-300 line-clamp-2 drop-shadow-xs">
              {displayTitle}
            </h5>
            <p className="text-[9px] text-slate-400 mt-1 truncate">
              {resource.uploadedBy ? `Prof. / Roll: ${resource.uploadedBy}` : 'Computer Engineering Dept · SAKEC'}
            </p>
          </div>

          {/* Bottom Row: File Info Badge */}
          <div className="flex items-center justify-between pl-10 relative z-10 pt-1 border-t border-slate-700/50 text-[8.5px] font-mono text-slate-400">
            <span>{resource.type || 'Lecture Notes'}</span>
            <span className="text-amber-300 font-bold">{resource.fileSize}</span>
          </div>
        </div>
      )}
    </div>
  );
};
