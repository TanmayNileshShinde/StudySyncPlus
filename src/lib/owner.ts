/**
 * Anonymous, stable per-browser owner key.
 *
 * StudySyncPlus is public and auth-free by design; this key gives each browser
 * a stable identity for bookmarks, ratings and upload ownership. It is intent
 * protection (prevents accidental cross-browser edits), not security — anyone
 * can mint a key. Documented as a known limitation in FEATURES.md.
 */
const OWNER_STORAGE_KEY = 'studysyncplus_owner_key';

export function getOwnerKey(): string {
  try {
    const existing = localStorage.getItem(OWNER_STORAGE_KEY);
    if (existing) return existing;

    const minted =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `owner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(OWNER_STORAGE_KEY, minted);
    return minted;
  } catch {
    // Storage blocked — fall back to a session-only key.
    return 'anonymous-session';
  }
}
