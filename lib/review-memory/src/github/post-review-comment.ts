import type { PostedComment } from "./types.js";
import { parsePrUrl, githubRequest } from "./client.js";

interface GithubPr {
  head: { sha: string };
}

interface GithubComment {
  id: number;
  html_url: string;
  body: string;
  path: string;
  line: number;
  created_at: string;
}

/**
 * Post an inline review comment on a specific line of a pull request.
 *
 * The comment is attached to the right-hand (new) side of the diff at the
 * given line number. The latest commit SHA of the PR head is resolved
 * automatically so you only need the PR URL.
 *
 * @param prUrl       - Full GitHub PR URL, e.g. `https://github.com/owner/repo/pull/42`
 * @param filePath    - Repository-relative file path, e.g. `src/auth/login.ts`
 * @param lineNumber  - Absolute line number in the *new* file version to attach the comment to.
 * @param commentBody - Markdown body of the review comment.
 * @returns Metadata about the posted comment (id, url, timestamps).
 *
 * @example
 * ```ts
 * const comment = await post_review_comment(
 *   "https://github.com/acme/api/pull/7",
 *   "src/auth/login.ts",
 *   88,
 *   "Avoid non-null assertions here — use optional chaining instead.",
 * );
 * console.log("Posted:", comment.url);
 * ```
 */
export async function post_review_comment(
  prUrl: string,
  filePath: string,
  lineNumber: number,
  commentBody: string,
): Promise<PostedComment> {
  const { owner, repo, pullNumber } = parsePrUrl(prUrl);

  // Resolve the current head commit SHA of the PR.
  const pr = await githubRequest<GithubPr>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}`,
  );
  const commitId = pr.head.sha;

  const posted = await githubRequest<GithubComment>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        body: commentBody,
        commit_id: commitId,
        path: filePath,
        line: lineNumber,
        side: "RIGHT",
      }),
    },
  );

  return {
    id: posted.id,
    url: posted.html_url,
    body: posted.body,
    path: posted.path,
    line: posted.line,
    createdAt: posted.created_at,
  };
}
