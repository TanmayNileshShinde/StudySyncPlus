import { zipSync, strToU8, type Zippable } from 'fflate';
import type { StudyResource } from '../types';
import { apiService } from '../services/apiService';

/**
 * Bulk download: bundles every downloadable artifact of a subject into one
 * ZIP. Stored files are fetched from the backend; legacy seeded rows fall
 * back to their generated summary sheet. A README manifest carries the
 * provenance for every entry.
 */
export async function downloadResourcesAsZip(
  subjectName: string,
  courseCode: string,
  resources: StudyResource[],
  collectArtifact: (resource: StudyResource) => Promise<{ url: string; fileName: string } | null>,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const files: Zippable = {};
  const manifestLines: string[] = [
    'STUDYSYNCPLUS — COURSE FILE ARCHIVE',
    `${subjectName} (${courseCode})`,
    'Shah & Anchor Kutchhi Engineering College · Semester III',
    `Exported: ${new Date().toISOString().slice(0, 10)}`,
    `Contents: ${resources.length} item(s)`,
    ''
  ];

  const usedNames = new Set<string>();
  const safeName = (raw: string, ext: string): string => {
    const base = raw.replace(/[^a-zA-Z0-9 _.-]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
    let candidate = `${base}.${ext}`;
    let n = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      candidate = `${base} (${n}).${ext}`;
      n += 1;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  };

  let done = 0;
  for (const resource of resources) {
    const artifact = await collectArtifact(resource);
    if (artifact) {
      try {
        const response = await fetch(artifact.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const ext = resource.fileKind === 'pptx' ? 'pptx' : resource.fileKind === 'ppt' ? 'ppt' : 'pdf';
        const name = safeName(artifact.fileName.replace(/\.[a-z0-9]+$/i, ''), ext);
        files[name] = bytes;
        manifestLines.push(`${name} — ${resource.title} · ${resource.type} · uploaded by ${resource.uploadedBy}`);
      } catch {
        // Unreachable file: keep the archive complete by writing the summary instead.
        const name = safeName(resource.title, 'txt');
        files[name] = strToU8(apiService.generateResourceSummaryText(resource));
        manifestLines.push(`${name} — ${resource.title} · download failed, summary included`);
      }
    } else {
      const name = safeName(resource.title, 'txt');
      files[name] = strToU8(apiService.generateResourceSummaryText(resource));
      manifestLines.push(`${name} — ${resource.title} · summary sheet (no stored file)`);
    }
    done += 1;
    onProgress?.(done, resources.length);
  }

  manifestLines.push(
    '',
    'Developed by Tanmay Shinde (126BTCM2008 · Roll 67) & Aditya Shah (126BTCM2009 · Roll 68).',
    'Verified academic material · StudySyncPlus academic portal.'
  );
  files['README.txt'] = strToU8(manifestLines.join('\n'));

  // PDFs/PPTs are already compressed formats — store them without re-compression.
  const zipped = zipSync(files, { level: 0 });
  const blob = new Blob([zipped], { type: 'application/zip' });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = `${courseCode || subjectName}_${subjectName}`.replace(/[^a-zA-Z0-9]+/g, '_') + '_CourseFile.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}
