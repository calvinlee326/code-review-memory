/**
 * @workspace/review-memory
 *
 * PR code review agent memory module.
 *
 * ## Quick start
 *
 * ```ts
 * import { load_memory, search_memory, addReviewError } from "@workspace/review-memory";
 *
 * // At startup: parse coding_style.md and load persisted review errors.
 * const { highlightsLoaded, errorsLoaded } = await load_memory();
 *
 * // Document a past review error (persisted to disk automatically).
 * addReviewError({
 *   prId: "PR#17",
 *   file: "src/auth/login.ts",
 *   line: 42,
 *   errorType: "null-safety",
 *   description: "Non-null assertion used on user object without guard.",
 *   suggestion: "Use optional chaining (?.) or add an explicit null check before accessing the property.",
 *   ruleViolated: "Null and Undefined Safety",
 *   severity: "high",
 * });
 *
 * // Search for relevant rules or past errors by keyword.
 * const results = search_memory("null safety async");
 * for (const r of results) {
 *   console.log(r.score, r.entry.description);
 * }
 * ```
 */

// Core functions
export { load_memory } from "./load-memory.js";
export type { LoadMemoryOptions, LoadMemoryResult } from "./load-memory.js";

export { search_memory } from "./search-memory.js";
export type { SearchMemoryOptions } from "./search-memory.js";

// Store management
export {
  addReviewError,
  removeReviewError,
  getStore,
  getStyleHighlights,
  getReviewErrors,
} from "./store.js";
export type { NewReviewError } from "./store.js";

// Types
export type {
  StyleHighlight,
  ReviewError,
  MemoryEntry,
  MemoryStore,
  SearchResult,
} from "./types.js";
