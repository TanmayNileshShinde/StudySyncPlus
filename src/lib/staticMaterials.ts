/**
 * Static PDF mapping for official course resources and study guides.
 * Resolves local assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string; courseCode?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''} ${doc.courseCode || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  // OS Lab Experiments 1 through 8 (SYCM1_67_OS_EXPT1-8.pdf)
  for (let i = 1; i <= 8; i++) {
    const pattern = new RegExp(`\\b(res-os-00${i}|SYCM1_67_OS_EXPT0?${i}|EXPT0?${i}|Experiment\\s*0?${i})\\b`, 'i');
    if (pattern.test(str)) {
      return `${base}/pdf-files-to-test/os/SYCM1_67_OS_EXPT${i}.pdf`;
    }
  }

  // Data Structures & Algorithms (DSA) Master Guide
  if (/Data Structure|DSA|Stack|Queue|CMCOR2PC203|Tree|Linked List|res-020/i.test(str)) {
    return `${base}/pdf-files-to-test/DSA_MSE_Master_Study_Guide.pdf`;
  }

  return null;
};
