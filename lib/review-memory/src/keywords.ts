/**
 * Stop-words that carry no search value.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "not", "no", "nor",
  "so", "yet", "both", "either", "neither", "if", "as", "than", "then",
  "that", "this", "these", "those", "it", "its", "they", "their", "them",
  "we", "our", "you", "your", "he", "she", "his", "her", "all", "each",
  "every", "any", "also", "when", "where", "how", "what", "which", "who",
  "use", "used", "using", "make", "makes", "made", "must", "always", "never",
  "only", "more", "most", "other", "such", "same", "per",
]);

/**
 * Extract meaningful lowercase keyword tokens from arbitrary text.
 * Splits on non-alphanumeric characters, filters stop words and short tokens.
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/**
 * Deduplicate an array of strings, preserving order.
 */
export function deduplicateKeywords(keywords: string[]): string[] {
  return [...new Set(keywords)];
}

/**
 * Build a keyword list from multiple text sources.
 */
export function buildKeywords(...texts: string[]): string[] {
  const tokens = texts.flatMap((t) => extractKeywords(t));
  return deduplicateKeywords(tokens);
}
