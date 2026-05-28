import type { OpenAITool } from "./types.js";

/**
 * OpenAI function-calling schema for read_pr_diff.
 *
 * Drop this directly into the `tools` array of a chat completions request.
 *
 * @example
 * ```ts
 * import { readPrDiffTool, postReviewCommentTool } from "@workspace/review-memory";
 *
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4o",
 *   messages: [...],
 *   tools: [readPrDiffTool, postReviewCommentTool],
 *   tool_choice: "auto",
 * });
 * ```
 */
export const readPrDiffTool: OpenAITool = {
  type: "function",
  function: {
    name: "read_pr_diff",
    description:
      "Read the full diff of a GitHub pull request. Returns every changed file with its filename, change status (added/modified/removed/renamed), line counts, and the raw unified-diff patch. Use this to understand what code changed before writing review comments.",
    parameters: {
      type: "object",
      properties: {
        pr_url: {
          type: "string",
          description:
            "Full URL of the GitHub pull request, e.g. https://github.com/owner/repo/pull/42",
        },
      },
      required: ["pr_url"],
    },
  },
};

/**
 * OpenAI function-calling schema for post_review_comment.
 *
 * Drop this directly into the `tools` array of a chat completions request.
 */
export const postReviewCommentTool: OpenAITool = {
  type: "function",
  function: {
    name: "post_review_comment",
    description:
      "Post an inline code review comment on a specific line of a GitHub pull request. The comment appears as an inline annotation in the PR diff view on GitHub. Use this after read_pr_diff to leave targeted, actionable feedback on a particular line.",
    parameters: {
      type: "object",
      properties: {
        pr_url: {
          type: "string",
          description:
            "Full URL of the GitHub pull request, e.g. https://github.com/owner/repo/pull/42",
        },
        file_path: {
          type: "string",
          description:
            "Repository-relative path to the file being reviewed, e.g. src/auth/login.ts",
        },
        line_number: {
          type: "number",
          description:
            "Absolute line number in the new (right-hand) version of the file where the comment should be anchored.",
        },
        comment_body: {
          type: "string",
          description:
            "Markdown content of the review comment. Be specific: describe what the issue is, why it matters, and suggest a concrete fix.",
        },
      },
      required: ["pr_url", "file_path", "line_number", "comment_body"],
    },
  },
};

/**
 * Convenience array of both tools — pass to `tools:` in a single spread.
 *
 * @example
 * ```ts
 * import { githubTools } from "@workspace/review-memory";
 *
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4o",
 *   messages: [...],
 *   tools: githubTools,
 * });
 * ```
 */
export const githubTools: OpenAITool[] = [readPrDiffTool, postReviewCommentTool];
