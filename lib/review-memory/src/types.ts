/**
 * A coding style rule extracted from coding_style.md.
 */
export interface StyleHighlight {
  id: string;
  /** Section heading (e.g. "Naming Conventions") */
  category: string;
  /** Sub-heading or derived rule title (e.g. "Variables and Functions") */
  rule: string;
  /** Full description text of the rule */
  description: string;
  /** Lowercase tokens used for keyword search */
  keywords: string[];
  source: "coding_style";
}

/**
 * A past PR review error, documented for future reference.
 */
export interface ReviewError {
  id: string;
  /** ISO 8601 timestamp when this error was recorded */
  timestamp: string;
  /** PR identifier, e.g. "PR#42" */
  prId?: string;
  /** File path where the error occurred */
  file?: string;
  /** Line number in the file */
  line?: number;
  /** Error category, e.g. "naming", "null-safety", "formatting", "async" */
  errorType: string;
  /** Human-readable description of what the error was */
  description: string;
  /** Suggested fix or improvement */
  suggestion: string;
  /** Which style rule (from StyleHighlight.rule) was violated, if any */
  ruleViolated?: string;
  severity: "low" | "medium" | "high";
  /** Lowercase tokens used for keyword search */
  keywords: string[];
  source: "review_error";
}

export type MemoryEntry = StyleHighlight | ReviewError;

/**
 * The full in-memory store shape, also the shape of the persisted JSON.
 */
export interface MemoryStore {
  styleHighlights: StyleHighlight[];
  reviewErrors: ReviewError[];
  /** ISO 8601 timestamp of the last load/update */
  lastUpdated: string;
  /** Incremented on every structural change */
  version: number;
}

/**
 * A single result from search_memory().
 */
export interface SearchResult {
  entry: MemoryEntry;
  /** How many query keywords matched */
  score: number;
  /** Which query keywords were found */
  matchedKeywords: string[];
}
