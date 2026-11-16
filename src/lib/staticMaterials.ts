/**
 * Static PDF mapping for official course resources and study guides.
 * Resolves local assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string; courseCode?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''} ${doc.courseCode || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  // Standardized Course Materials: 1 PDF Note & 1 PPTX Slide Deck per Module across all 12 subjects
  const subjectSlugs = [
    { slug: 'dsa', code: 'CMCOR2PC203', name: 'data structures' },
    { slug: 'os', code: 'CMCOR2PC202', name: 'operating system' },
    { slug: 'mp', code: 'CMCOR2PC204', name: 'microprocessor' },
    { slug: 'ds', code: 'CMCOR2PC201', name: 'discrete structures' },
    { slug: 'fes', code: 'CMCOR2MD201', name: 'foundation of embedded' },
    { slug: 'wt2', code: 'CMLOR2VS201', name: 'web technology' },
    { slug: 'java', code: 'CMLOR2VS202', name: 'java' },
    { slug: 'ips', code: 'CMLOR2IK201.1', name: 'indian philosophical' },
    { slug: 'scl', code: 'CMLOR2IK201.2', name: 'sanskrit' },
    { slug: 'ecn', code: 'CMLOR2ED201', name: 'engineering career' },
    { slug: 'cep', code: 'CMLOR2CP201', name: 'community engagement' },
    { slug: 'bc', code: 'CMLOR2BC201', name: 'bridge course' }
  ];

  for (const s of subjectSlugs) {
    const isSubject = str.toLowerCase().includes(s.code.toLowerCase()) || 
                      str.toLowerCase().includes(s.name.toLowerCase()) || 
                      str.toLowerCase().includes(`res-${s.slug}-`);
    if (isSubject) {
      for (let m = 1; m <= 4; m++) {
        const isModule = new RegExp(`\\b(module\\s*${m}|mod\\s*${m}|m${m})\\b`, 'i').test(str);
        if (isModule) {
          const isSlide = /slide|presentation|pptx|\bppt\b/i.test(str);
          if (isSlide) {
            return `${base}/materials/${s.slug}/${s.slug}_mod${m}_slides.pptx`;
          }
          return `${base}/materials/${s.slug}/${s.slug}_mod${m}_notes.pdf`;
        }
      }
    }
  }

  // Web Technology II (WT2) Lab Experiments (SYCM1_67_WTII_EXPT*.pdf)
  for (let i = 10; i >= 1; i--) {
    const pattern = new RegExp(`\\b(res-wt2-0*${i}|SYCM1_67_WTII_EXPT0*${i}|WTII_EXPT0*${i}|WT2_EXPT0*${i})\\b`, 'i');
    if (pattern.test(str)) {
      return `${base}/pdf-files-to-test/wt2/SYCM1_67_WTII_EXPT${i}.pdf`;
    }
  }

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
