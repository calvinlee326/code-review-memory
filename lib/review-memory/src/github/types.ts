/**
 * A single file entry returned by the GitHub PR files API.
 */
export interface PrFileChange {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  /** Raw unified-diff patch for this file. Undefined for binary files. */
  patch?: string;
  /** SHA of the blob after the change */
  sha: string;
  /** Previous filename, only present when status is "renamed" */
  previousFilename?: string;
}

/**
 * Parsed GitHub PR coordinates extracted from a PR URL.
 */
export interface PrCoords {
  owner: string;
  repo: string;
  pullNumber: number;
}

/**
 * Result of post_review_comment.
 */
export interface PostedComment {
  id: number;
  url: string;
  body: string;
  path: string;
  line: number;
  createdAt: string;
}

/**
 * OpenAI function-calling tool schema type (chat completions API).
 */
export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description: string;
          enum?: string[];
        }
      >;
      required: string[];
    };
  };
}
