/**
 * Byte formatting shared with the Convex mapping (convex/validators.ts).
 * Kept identical so server-computed display strings match client fallbacks.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.0 MB';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
