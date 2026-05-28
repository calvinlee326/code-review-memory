import OpenAI from "openai";
import {
  load_memory,
  read_pr_diff,
  post_review_comment,
  addReviewError,
  getStyleHighlights,
} from "@workspace/review-memory";
import type { PrFileChange } from "@workspace/review-memory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewIssue {
  file: string;
  line: number;
  issue: string;
  severity: "low" | "medium" | "high";
}

export interface EvaluationItem {
  file: string;
  line: number;
  action: "keep" | "modify" | "delete" | "add";
  comment: string;
  revised_comment?: string | null;
}

export type HarnessEvent =
  | { type: "memory_loaded"; highlightsLoaded: number; errorsLoaded: number }
  | { type: "files_fetched"; total: number; patchable: number }
  | { type: "file_reviewed"; filename: string; issueCount: number }
  | { type: "plan_complete"; issues: ReviewIssue[] }
  | { type: "evaluation_complete"; kept: number; modified: number; deleted: number; added: number; report: EvaluationItem[] }
  | { type: "comment_posted"; file: string; line: number; url: string; action: string }
  | { type: "done"; totalPosted: number }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODEL = "gpt-4o";
const MAX_PATCH_CHARS = 4000;

function getOpenAI(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  return new OpenAI({ apiKey });
}

function parseJsonResponse<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function truncatePatch(patch: string): string {
  return patch.length <= MAX_PATCH_CHARS
    ? patch
    : patch.slice(0, MAX_PATCH_CHARS) + "\n... [diff truncated]";
}

function buildStyleRulesText(): string {
  return getStyleHighlights()
    .map((h) => `[${h.category} › ${h.rule}] ${h.description}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Planning phase
// ---------------------------------------------------------------------------

async function planningPhase(
  openai: OpenAI,
  files: PrFileChange[],
  styleRulesText: string,
  emit: (e: HarnessEvent) => void,
): Promise<ReviewIssue[]> {
  const plan: ReviewIssue[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a strict code reviewer. Output only valid JSON arrays, no prose.",
        },
        {
          role: "user",
          content: `Review this file diff against the coding style rules below.
Return ONLY a JSON array. If no issues, return [].
Schema: [{"file": string, "line": number, "issue": string, "severity": "low"|"medium"|"high"}]

Rules:
${styleRulesText}

File: ${file.filename} (${file.status})
Diff:
${truncatePatch(file.patch)}`,
        },
      ],
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    const issues = parseJsonResponse<ReviewIssue[]>(content, []);
    plan.push(...issues);
    emit({ type: "file_reviewed", filename: file.filename, issueCount: issues.length });
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Evaluation phase
// ---------------------------------------------------------------------------

async function evaluationPhase(
  openai: OpenAI,
  plan: ReviewIssue[],
  styleRulesText: string,
): Promise<EvaluationItem[]> {
  if (plan.length === 0) return [];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are a senior code reviewer doing a quality audit. Output only valid JSON arrays, no prose.",
      },
      {
        role: "user",
        content: `Audit this review_plan against the style rules.

For EACH item, decide:
  "keep"   — valid and well-phrased
  "modify" — valid but comment needs improvement (provide revised_comment)
  "delete" — false positive or not a real violation

If any HIGH severity rules are clearly violated but MISSING, add with action "add".

Return ONLY JSON:
[{"file": string, "line": number, "action": "keep"|"modify"|"delete"|"add", "comment": string, "revised_comment": string|null}]

Style Rules:
${styleRulesText}

Review Plan:
${JSON.stringify(plan, null, 2)}`,
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  return parseJsonResponse<EvaluationItem[]>(content, []);
}

// ---------------------------------------------------------------------------
// Execution phase
// ---------------------------------------------------------------------------

async function executionPhase(
  plan: ReviewIssue[],
  report: EvaluationItem[],
  prUrl: string,
  emit: (e: HarnessEvent) => void,
): Promise<number> {
  const toPost = report.filter((i) => i.action !== "delete");
  let posted = 0;

  for (const item of toPost) {
    const body = item.revised_comment ?? item.comment;
    const severity =
      plan.find((r) => r.file === item.file && r.line === item.line)?.severity ?? "medium";

    try {
      const result = await post_review_comment(prUrl, item.file, item.line, body);
      emit({ type: "comment_posted", file: item.file, line: item.line, url: result.url, action: item.action });
      posted++;

      addReviewError({
        prId: prUrl,
        file: item.file,
        line: item.line,
        errorType: "style-violation",
        description: item.comment,
        suggestion: body,
        severity: severity as "low" | "medium" | "high",
      });
    } catch (err) {
      emit({ type: "error", message: `Failed to post on ${item.file}:${item.line} — ${String(err)}` });
    }
  }

  return posted;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full PR code review pipeline.
 *
 * Emits HarnessEvent objects via `onEvent` as each phase progresses so callers
 * can stream live updates (e.g. via SSE).
 *
 * @param prUrl   - Full GitHub PR URL
 * @param onEvent - Callback invoked for each progress event
 */
export async function run_harness(
  prUrl: string,
  onEvent: (event: HarnessEvent) => void,
): Promise<void> {
  // Step 1: Load memory
  const { highlightsLoaded, errorsLoaded } = await load_memory();
  onEvent({ type: "memory_loaded", highlightsLoaded, errorsLoaded });

  const styleRulesText = buildStyleRulesText();

  // Step 2: Read PR diff
  const files = await read_pr_diff(prUrl);
  const patchable = files.filter((f) => f.patch);
  onEvent({ type: "files_fetched", total: files.length, patchable: patchable.length });

  if (patchable.length === 0) {
    onEvent({ type: "done", totalPosted: 0 });
    return;
  }

  const openai = getOpenAI();

  // Step 3: Planning phase
  const plan = await planningPhase(openai, patchable, styleRulesText, onEvent);
  onEvent({ type: "plan_complete", issues: plan });

  // Step 4: Evaluation phase
  const report = await evaluationPhase(openai, plan, styleRulesText);
  const kept = report.filter((i) => i.action === "keep").length;
  const modified = report.filter((i) => i.action === "modify").length;
  const deleted = report.filter((i) => i.action === "delete").length;
  const added = report.filter((i) => i.action === "add").length;
  onEvent({ type: "evaluation_complete", kept, modified, deleted, added, report });

  // Step 5: Execution phase
  const totalPosted = await executionPhase(plan, report, prUrl, onEvent);
  onEvent({ type: "done", totalPosted });
}
