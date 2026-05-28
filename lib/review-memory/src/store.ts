import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { MemoryStore, ReviewError, StyleHighlight } from "./types.js";
import { buildKeywords } from "./keywords.js";

const EMPTY_STORE: MemoryStore = {
  styleHighlights: [],
  reviewErrors: [],
  lastUpdated: new Date().toISOString(),
  version: 0,
};

let store: MemoryStore = structuredClone(EMPTY_STORE);
let persistPath: string | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function persist(): void {
  if (!persistPath) return;
  fs.writeFileSync(persistPath, JSON.stringify(store, null, 2), "utf8");
}

function touch(): void {
  store.lastUpdated = new Date().toISOString();
  store.version += 1;
}

// ---------------------------------------------------------------------------
// Initialise / reset
// ---------------------------------------------------------------------------

/**
 * Replace the in-memory store with a fresh one, optionally linking a JSON
 * file for persistence.
 *
 * @param storePath - Absolute or relative path to the review_errors JSON file.
 *   When provided the store is loaded from disk (if the file exists) and all
 *   writes are persisted back to disk automatically.
 */
export function initStore(storePath?: string): void {
  if (storePath) {
    persistPath = path.resolve(storePath);
    if (fs.existsSync(persistPath)) {
      const raw = fs.readFileSync(persistPath, "utf8");
      try {
        store = JSON.parse(raw) as MemoryStore;
        return;
      } catch {
        // Corrupt file — start fresh
      }
    }
  }
  store = structuredClone(EMPTY_STORE);
}

// ---------------------------------------------------------------------------
// Style highlights
// ---------------------------------------------------------------------------

/**
 * Replace all style highlights in the store (called by load_memory).
 */
export function setStyleHighlights(highlights: StyleHighlight[]): void {
  store.styleHighlights = highlights;
  touch();
  persist();
}

// ---------------------------------------------------------------------------
// Review errors — CRUD
// ---------------------------------------------------------------------------

/**
 * Input shape for adding a new review error. `id`, `timestamp`, `keywords`,
 * and `source` are generated automatically.
 */
export type NewReviewError = Omit<
  ReviewError,
  "id" | "timestamp" | "keywords" | "source"
> & {
  /** Optional extra keywords beyond what is auto-extracted from the text. */
  extraKeywords?: string[];
};

/**
 * Document a new past PR review error in the store.
 *
 * @returns The fully populated ReviewError that was stored.
 */
export function addReviewError(input: NewReviewError): ReviewError {
  const {
    extraKeywords = [],
    prId,
    file,
    line,
    errorType,
    description,
    suggestion,
    ruleViolated,
    severity,
  } = input;

  const keywords = buildKeywords(
    errorType,
    description,
    suggestion,
    ruleViolated ?? "",
    prId ?? "",
    file ?? "",
    ...extraKeywords,
  );

  const entry: ReviewError = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    source: "review_error",
    prId,
    file,
    line,
    errorType,
    description,
    suggestion,
    ruleViolated,
    severity,
    keywords,
  };

  store.reviewErrors.push(entry);
  touch();
  persist();
  return entry;
}

/**
 * Remove a review error by id.
 *
 * @returns `true` if the entry was found and removed.
 */
export function removeReviewError(id: string): boolean {
  const before = store.reviewErrors.length;
  store.reviewErrors = store.reviewErrors.filter((e) => e.id !== id);
  if (store.reviewErrors.length !== before) {
    touch();
    persist();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Read access
// ---------------------------------------------------------------------------

/** Return a shallow copy of the entire store (for inspection / serialisation). */
export function getStore(): MemoryStore {
  return {
    styleHighlights: [...store.styleHighlights],
    reviewErrors: [...store.reviewErrors],
    lastUpdated: store.lastUpdated,
    version: store.version,
  };
}

/** Return all style highlights. */
export function getStyleHighlights(): StyleHighlight[] {
  return [...store.styleHighlights];
}

/** Return all review errors. */
export function getReviewErrors(): ReviewError[] {
  return [...store.reviewErrors];
}
