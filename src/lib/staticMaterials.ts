/**
 * Static PDF mapping for official course resources and study guides.
 * Resolves local assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string; courseCode?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''} ${doc.courseCode || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  if (/Data Structure|DSA|Stack|Queue|CMCOR2PC203|Tree|Linked List|res-020|res-021/i.test(str)) {
    return `${base}/pdf-files-to-test/DSA_MSE_Master_Study_Guide.pdf`;
  }
  return null;
};
