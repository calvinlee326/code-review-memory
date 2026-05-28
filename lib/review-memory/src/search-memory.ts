import type { MemoryEntry, SearchResult } from "./types.js";
import { extractKeywords } from "./keywords.js";
import { getStyleHighlights, getReviewErrors } from "./store.js";

export interface SearchMemoryOptions {
  /**
   * Maximum number of results to return.
   * @default 10
   */
  limit?: number;

  /**
   * Restrict results to a specific entry source.
   * - `"coding_style"` — only style highlights
   * - `"review_error"`  — only past review errors
   * - `undefined`       — both (default)
   */
  source?: "coding_style" | "review_error";

  /**
   * Minimum number of keyword matches required to include an entry.
   * @default 1
   */
  minScore?: number;
}

/**
 * Search the in-memory store using simple keyword matching.
 *
 * The query is tokenised into keywords (stop words removed). Each memory entry
 * carries a pre-built keyword list. The score for an entry is the count of
 * query keywords that appear in the entry's keyword list. Entries with a score
 * below `minScore` are excluded. Results are returned sorted by descending
 * score.
 *
 * @param query - Natural-language or keyword query string
 * @param options - Optional search configuration
 * @returns Sorted array of SearchResult objects
 *
 * @example
 * ```ts
 * import { search_memory } from "@workspace/review-memory";
 *
 * const results = search_memory("null safety async await");
 * for (const r of results) {
 *   console.log(`[${r.score}] ${r.entry.source}: ${r.entry.description}`);
 * }
 * ```
 */
export function search_memory(
  query: string,
  options: SearchMemoryOptions = {},
): SearchResult[] {
  const { limit = 10, source, minScore = 1 } = options;

  if (!query || query.trim() === "") {
    return [];
  }

  const queryKeywords = extractKeywords(query);
  if (queryKeywords.length === 0) {
    return [];
  }

  // Collect candidate entries
  const candidates: MemoryEntry[] = [];
  if (!source || source === "coding_style") {
    candidates.push(...getStyleHighlights());
  }
  if (!source || source === "review_error") {
    candidates.push(...getReviewErrors());
  }

  // Score each candidate
  const results: SearchResult[] = [];

  for (const entry of candidates) {
    const entryKeywordSet = new Set(entry.keywords);
    const matched: string[] = [];

    for (const qk of queryKeywords) {
      if (entryKeywordSet.has(qk)) {
        matched.push(qk);
      }
    }

    if (matched.length >= minScore) {
      results.push({
        entry,
        score: matched.length,
        matchedKeywords: matched,
      });
    }
  }

  // Sort by score descending, then by entry type (style highlights first for
  // ties) for a stable, predictable order.
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aIsStyle = a.entry.source === "coding_style" ? 0 : 1;
    const bIsStyle = b.entry.source === "coding_style" ? 0 : 1;
    return aIsStyle - bIsStyle;
  });

  return results.slice(0, limit);
}
