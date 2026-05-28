import { randomUUID } from "crypto";
import type { StyleHighlight } from "./types.js";
import { buildKeywords } from "./keywords.js";

interface ParsedSection {
  category: string;
  rule: string;
  descriptionLines: string[];
}

/**
 * Parse a Markdown style guide into structured StyleHighlight entries.
 *
 * Parsing rules:
 *   - `##` headings → category (top-level section)
 *   - `###` headings → rule title (sub-section)
 *   - All other non-empty lines under a `###` block → description
 *   - Lines starting with `#` that are neither `##` nor `###` are ignored
 *
 * @param markdown - Raw Markdown string from coding_style.md
 * @returns Array of StyleHighlight entries
 */
export function parseStyleGuide(markdown: string): StyleHighlight[] {
  const lines = markdown.split("\n");
  const sections: ParsedSection[] = [];

  let currentCategory = "";
  let currentRule = "";
  let currentDescLines: string[] = [];

  function flushSection(): void {
    if (currentRule && currentDescLines.length > 0) {
      sections.push({
        category: currentCategory,
        rule: currentRule,
        descriptionLines: [...currentDescLines],
      });
    }
    currentDescLines = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      flushSection();
      currentRule = line.replace(/^###\s+/, "").trim();
    } else if (line.startsWith("## ")) {
      flushSection();
      currentCategory = line.replace(/^##\s+/, "").trim();
      currentRule = "";
    } else if (line.startsWith("# ")) {
      // Top-level title — skip
    } else if (line.trim() !== "") {
      if (currentRule) {
        currentDescLines.push(line.replace(/^[-*]\s+/, "").trim());
      }
    }
  }
  flushSection();

  return sections.map((s) => {
    const description = s.descriptionLines.join(" ");
    return {
      id: randomUUID(),
      category: s.category,
      rule: s.rule,
      description,
      keywords: buildKeywords(s.category, s.rule, description),
      source: "coding_style" as const,
    };
  });
}
