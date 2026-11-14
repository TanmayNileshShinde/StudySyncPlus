/**
 * Static PDF mapping for official course experiment manuals and lab materials.
 * Resolves local public/materials assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  if (/Experiment 1|WT2_Exp1|res-wt2-exp1/i.test(str)) {
    return `${base}/materials/WT2_Exp1_Form_Validation_LocalStorage.pdf`;
  }
  if (/Experiment 2|WT2_Exp2|res-wt2-exp2/i.test(str)) {
    return `${base}/materials/WT2_Exp2_Live_Clock_Calendar_DOM.pdf`;
  }
  if (/Experiment 3|WT2_Exp3|res-wt2-exp3/i.test(str)) {
    return `${base}/materials/WT2_Exp3_REST_API_Fetch.pdf`;
  }
  if (/Experiment 4|WT2_Exp4|res-wt2-exp4/i.test(str)) {
    return `${base}/materials/WT2_Exp4_Live_Search_Filter_AJAX.pdf`;
  }
  return null;
};
