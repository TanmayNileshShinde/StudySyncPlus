/**
 * Inert stand-ins for the browser canvas globals that the pdfjs-dist legacy
 * build touches at module-evaluation time (e.g. `const SCALE_MATRIX = new
 * DOMMatrix()`). Text extraction never renders, so empty classes are enough.
 *
 * This module must import NOTHING — the bundler evaluates a module's imports
 * before its own body, so any import here (even the worker) would make pdfjs
 * evaluate before the globals exist again.
 */
type UnknownRecord = Record<string, unknown>;
const g = globalThis as UnknownRecord;
if (!g.DOMMatrix) g.DOMMatrix = class {};
if (!g.ImageData) g.ImageData = class {};
if (!g.Path2D) g.Path2D = class {};

/**
 * Replace the sandbox's structuredClone: the Convex runtime's implementation
 * throws a non-catchable fatal error when the `{ transfer }` option is used,
 * and pdfjs's bundled core-js probes exactly that during module evaluation.
 * A self-contained clone that ignores transfer options keeps both the
 * evaluation-time probes and the fake-worker message loop working.
 */
type Cloneable = unknown;

function deepClone(value: Cloneable, seen: Map<unknown, unknown>): Cloneable {
  if (value === null || typeof value !== "object") {
    if (typeof value === "function") throw new Error("structuredClone cannot clone functions");
    return value;
  }
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) copy.push(deepClone(item, seen));
    return copy;
  }
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    // TypedArray/DataView constructor-copy preserves contents with a fresh buffer.
    const ctor = (value as object).constructor as new (src: object) => unknown;
    const copy = new ctor(value) as Cloneable;
    seen.set(value, copy);
    return copy;
  }
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const copy = new Map<unknown, unknown>();
    seen.set(value, copy);
    for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set<unknown>();
    seen.set(value, copy);
    for (const v of value) copy.add(deepClone(v, seen));
    return copy;
  }

  const copy: Record<string, Cloneable> = {};
  seen.set(value, copy);
  for (const [k, v] of Object.entries(value)) copy[k] = deepClone(v, seen);
  return copy;
}

g.structuredClone = (value: Cloneable, _options?: unknown): Cloneable => deepClone(value, new Map());

