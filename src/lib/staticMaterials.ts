/**
 * Static PDF mapping for official course resources and study guides.
 * Resolves local assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string; courseCode?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''} ${doc.courseCode || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  // Microprocessor (MP) Lab Experiments 1 through 8 (SYCM1_67_MP_EXPT1-8.pdf)
  for (let i = 8; i >= 1; i--) {
    const pattern = new RegExp(`\\b(res-mp-0*${i}|SYCM1_67_MP_EXPT0*${i}|MP_EXPT0*${i})\\b`, 'i');
    if (pattern.test(str)) {
      return `${base}/pdf-files-to-test/mp/SYCM1_67_MP_EXPT${i}.pdf`;
    }
  }

  // Operating System (OS) Lab Experiments 1 through 8 (SYCM1_67_OS_EXPT1-8.pdf)
  for (let i = 8; i >= 1; i--) {
    const pattern = new RegExp(`\\b(res-os-0*${i}|SYCM1_67_OS_EXPT0*${i}|OS_EXPT0*${i})\\b`, 'i');
    if (pattern.test(str)) {
      return `${base}/pdf-files-to-test/os/SYCM1_67_OS_EXPT${i}.pdf`;
    }
  }

  // Foundation of Embedded System (FES) Lab Experiments 1 through 10 (SYCM1_67_FES_EXPT1-10.pdf)
  for (let i = 10; i >= 1; i--) {
    const pattern = new RegExp(`\\b(res-fes-0*${i}|SYCM1_67_FES_EXPT0*${i}|FES_EXPT0*${i})\\b`, 'i');
    if (pattern.test(str)) {
      return `${base}/pdf-files-to-test/fes/SYCM1_67_FES_EXPT${i}.pdf`;
    }
  }

  // Data Structures & Algorithms (DSA) Master Guide
  if (/Data Structure|DSA|Stack|Queue|CMCOR2PC203|Tree|Linked List|res-020/i.test(str)) {
    return `${base}/pdf-files-to-test/DSA_MSE_Master_Study_Guide.pdf`;
  }

  return null;
};
