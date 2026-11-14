/**
 * Static PDF mapping for official course experiment manuals and lab materials.
 * Resolves local public/materials assets so students can view and download real PDFs.
 */

export const getStaticPdfUrl = (doc?: { title?: string; fileName?: string | null; id?: string; courseCode?: string } | null): string | null => {
  if (!doc) return null;
  const str = `${doc.title || ''} ${doc.fileName || ''} ${doc.id || ''} ${doc.courseCode || ''}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

  if (/Experiment 1|WT2_Exp1|res-wt2-exp1|EXPT\s*1\b|WEB2 EXPT1/i.test(str)) {
    return `${base}/materials/WT2_Exp1_Form_Validation_LocalStorage.pdf`;
  }
  if (/Experiment 2|WT2_Exp2|res-wt2-exp2|EXPT\s*2\b|WEB2 EXPT2/i.test(str)) {
    return `${base}/materials/WT2_Exp2_Live_Clock_Calendar_DOM.pdf`;
  }
  if (/Experiment 3|WT2_Exp3|res-wt2-exp3|EXPT\s*3\b|WEB2 EXPT3/i.test(str)) {
    return `${base}/materials/WT2_Exp3_REST_API_Fetch.pdf`;
  }
  if (/Experiment 4|WT2_Exp4|res-wt2-exp4|EXPT\s*4\b|WEB2 EXPT4/i.test(str)) {
    return `${base}/materials/WT2_Exp4_Live_Search_Filter_AJAX.pdf`;
  }
  if (/Data Structure|DSA|Stack|Queue|CMCOR2PC203|Tree|Linked List|res-020|res-021/i.test(str)) {
    return `${base}/pdf-files-to-test/DSA_MSE_Master_Study_Guide.pdf`;
  }
  if (/CMLOR2VS201|Web Technology|res-001|res-040|EXPT\s*(9|10|11|12)/i.test(str)) {
    return `${base}/materials/WT2_Exp1_Form_Validation_LocalStorage.pdf`;
  }
  return null;
};
