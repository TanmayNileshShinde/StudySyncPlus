import type { Id } from '../../convex/_generated/dataModel';

/**
 * Boundary adapters: every id the UI holds originates from a Convex query
 * result, so casting the opaque string back to the branded Id is sound. These
 * keep the app-level types plain strings while mutation calls stay type-safe.
 */
export function asResourceId(id: string): Id<'resources'> {
  return id as unknown as Id<'resources'>;
}

export function asSubjectId(id: string): Id<'subjects'> {
  return id as unknown as Id<'subjects'>;
}

export function asSemesterId(id: string): Id<'semesters'> {
  return id as unknown as Id<'semesters'>;
}

export function asStorageId(id: string): Id<'_storage'> {
  return id as unknown as Id<'_storage'>;
}
