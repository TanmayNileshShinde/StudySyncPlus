/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookmarks from "../bookmarks.js";
import type * as chat from "../chat.js";
import type * as extract from "../extract.js";
import type * as ingest from "../ingest.js";
import type * as ingestInternal from "../ingestInternal.js";
import type * as init from "../init.js";
import type * as migrations from "../migrations.js";
import type * as pdfjsWorkerSetup from "../pdfjsWorkerSetup.js";
import type * as rag from "../rag.js";
import type * as ragInternal from "../ragInternal.js";
import type * as ratings from "../ratings.js";
import type * as resources from "../resources.js";
import type * as scratchExtract from "../scratchExtract.js";
import type * as scratchInternal from "../scratchInternal.js";
import type * as seedData from "../seedData.js";
import type * as semesters from "../semesters.js";
import type * as subjects from "../subjects.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bookmarks: typeof bookmarks;
  chat: typeof chat;
  extract: typeof extract;
  ingest: typeof ingest;
  ingestInternal: typeof ingestInternal;
  init: typeof init;
  migrations: typeof migrations;
  pdfjsWorkerSetup: typeof pdfjsWorkerSetup;
  rag: typeof rag;
  ragInternal: typeof ragInternal;
  ratings: typeof ratings;
  resources: typeof resources;
  scratchExtract: typeof scratchExtract;
  scratchInternal: typeof scratchInternal;
  seedData: typeof seedData;
  semesters: typeof semesters;
  subjects: typeof subjects;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
