import fs from "fs";
import path from "path";
import { parseStyleGuide } from "./parse-style-guide.js";
import { initStore, setStyleHighlights } from "./store.js";

export interface LoadMemoryOptions {
  /**
   * Path to the Markdown coding style guide.
   * Defaults to `coding_style.md` in the current working directory.
   */
  styleGuidePath?: string;

  /**
   * Path to the JSON file used to persist review errors across restarts.
   * Defaults to `review_memory_store.json` in the current working directory.
   * Set to `null` to disable persistence (in-memory only).
   */
  storePath?: string | null;
}

export interface LoadMemoryResult {
  /** Number of style highlights extracted */
  highlightsLoaded: number;
  /** Number of review errors loaded from the persisted store */
  errorsLoaded: number;
  /** Warnings produced during loading (e.g. missing files) */
  warnings: string[];
}

/**
 * Load the agent memory at startup.
 *
 * 1. Reads and parses `coding_style.md`, extracting style highlights into
 *    in-memory storage.
 * 2. Loads persisted review errors from the JSON store file (if it exists).
 *
 * This function is idempotent — calling it again re-parses the style guide
 * and reloads the store from disk, which is useful after external changes.
 *
 * @example
 * ```ts
 * import { load_memory } from "@workspace/review-memory";
 *
 * const result = await load_memory();
 * console.log(`Loaded ${result.highlightsLoaded} style rules`);
 * ```
 */
export async function load_memory(
  options: LoadMemoryOptions = {},
): Promise<LoadMemoryResult> {
  const warnings: string[] = [];

  const styleGuidePath = path.resolve(
    options.styleGuidePath ?? path.join(process.cwd(), "coding_style.md"),
  );

  const storePath =
    options.storePath === null
      ? undefined
      : path.resolve(
          options.storePath ?? path.join(process.cwd(), "review_memory_store.json"),
        );

  // Initialise (or reload) the store, wiring up JSON persistence.
  initStore(storePath);

  // --- Parse coding_style.md ---
  let highlightsLoaded = 0;

  if (fs.existsSync(styleGuidePath)) {
    const markdown = fs.readFileSync(styleGuidePath, "utf8");
    const highlights = parseStyleGuide(markdown);
    setStyleHighlights(highlights);
    highlightsLoaded = highlights.length;
  } else {
    warnings.push(
      `Style guide not found at "${styleGuidePath}". No style highlights loaded.`,
    );
  }

  // --- Count persisted review errors already loaded by initStore ---
  const { getReviewErrors } = await import("./store.js");
  const errorsLoaded = getReviewErrors().length;

  return { highlightsLoaded, errorsLoaded, warnings };
}
