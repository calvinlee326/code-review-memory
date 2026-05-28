import type { PrFileChange } from "./types.js";
import { parsePrUrl, githubRequest } from "./client.js";

interface GithubFileEntry {
  sha: string;
  filename: string;
  status: PrFileChange["status"];
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

/**
 * Read every file change in a GitHub pull request.
 *
 * Automatically paginates to retrieve all files (GitHub caps each page at 30,
 * with a hard limit of 3 000 files per PR).
 *
 * @param prUrl - Full GitHub PR URL, e.g.
 *   `https://github.com/owner/repo/pull/42`
 * @returns Array of file-change objects, each containing the filename,
 *   change status, line counts, and the raw unified-diff patch.
 *
 * @example
 * ```ts
 * const files = await read_pr_diff("https://github.com/acme/api/pull/7");
 * for (const f of files) {
 *   console.log(f.filename, f.status, f.additions, f.deletions);
 *   if (f.patch) console.log(f.patch);
 * }
 * ```
 */
export async function read_pr_diff(prUrl: string): Promise<PrFileChange[]> {
  const { owner, repo, pullNumber } = parsePrUrl(prUrl);

  const allFiles: PrFileChange[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const entries = await githubRequest<GithubFileEntry[]>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=${perPage}&page=${page}`,
    );

    for (const entry of entries) {
      allFiles.push({
        filename: entry.filename,
        status: entry.status,
        additions: entry.additions,
        deletions: entry.deletions,
        changes: entry.changes,
        sha: entry.sha,
        patch: entry.patch,
        previousFilename: entry.previous_filename,
      });
    }

    if (entries.length < perPage) break;
    page++;
  }

  return allFiles;
}
