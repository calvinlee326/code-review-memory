import type { PrCoords } from "./types.js";

/**
 * Resolve the GitHub token from environment variables.
 * Reads GITHUB_TOKEN (set via Replit secrets or a .env file).
 *
 * @throws {Error} when the token is not configured.
 */
export function resolveToken(): string {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. Add it as a Replit secret or in your .env file.",
    );
  }
  return token;
}

/**
 * Parse a GitHub pull-request URL into its constituent parts.
 *
 * Supports:
 *   https://github.com/{owner}/{repo}/pull/{number}
 *   https://github.com/{owner}/{repo}/pull/{number}/files
 *   https://github.com/{owner}/{repo}/pull/{number}/commits/...
 *
 * @throws {Error} when the URL does not match the expected pattern.
 */
export function parsePrUrl(prUrl: string): PrCoords {
  const match = prUrl.match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
  );
  if (!match) {
    throw new Error(
      `Cannot parse PR URL: "${prUrl}". Expected format: https://github.com/{owner}/{repo}/pull/{number}`,
    );
  }
  return {
    owner: match[1]!,
    repo: match[2]!,
    pullNumber: parseInt(match[3]!, 10),
  };
}

/**
 * Minimal GitHub REST API client.
 * Uses the native fetch available in Node 24.
 */
export async function githubRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = resolveToken();
  const url = `https://api.github.com${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API error ${response.status} ${response.statusText} — ${path}\n${body}`,
    );
  }

  return response.json() as Promise<T>;
}
