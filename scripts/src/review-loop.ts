/**
 * PR Code Review Agent — Planning Loop
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run review-loop <pr-url>
 *
 * Flow:
 *   1. load_memory()        — parse coding_style.md + load past errors
 *   2. read_pr_diff()       — fetch all changed files from GitHub
 *   3. Planning phase       — GPT-4o reviews each file → review_plan
 *   4. Evaluation phase     — GPT-4o audits review_plan for gaps & quality → evaluation_report
 *   5. Execution phase      — post approved/modified comments, write errors to memory
 */

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
// Config
// ---------------------------------------------------------------------------

const PR_URL = process.argv[2];
const MAX_PATCH_CHARS = 4000;
const MODEL = "gpt-4o";

if (!PR_URL) {
  console.error("Usage: pnpm --filter @workspace/scripts run review-loop <pr-url>");
  console.error("Example: pnpm --filter @workspace/scripts run review-loop https://github.com/owner/repo/pull/42");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewIssue {
  file: string;
  line: number;
  issue: string;
  severity: "low" | "medium" | "high";
}

interface EvaluationItem {
  file: string;
  line: number;
  action: "keep" | "modify" | "delete" | "add";
  comment: string;
  revised_comment?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOpenAI(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it as a Replit secret.");
  }
  return new OpenAI({ apiKey });
}

/** Strip markdown code fences and parse JSON safely. */
function parseJsonResponse<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn("  Warning: could not parse LLM JSON response.");
    console.warn("  Raw:", raw.slice(0, 200));
    return fallback;
  }
}

function truncatePatch(patch: string): string {
  if (patch.length <= MAX_PATCH_CHARS) return patch;
  return patch.slice(0, MAX_PATCH_CHARS) + "\n... [diff truncated]";
}

// ---------------------------------------------------------------------------
// Phase 1: Planning — per-file review
// ---------------------------------------------------------------------------

async function runPlanningPhase(
  openai: OpenAI,
  files: PrFileChange[],
  styleRulesText: string,
): Promise<ReviewIssue[]> {
  const review_plan: ReviewIssue[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    process.stdout.write(`  Reviewing ${file.filename} ... `);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a strict code reviewer. You only output valid JSON arrays — no prose, no markdown fences.",
        },
        {
          role: "user",
          content: `Review the file diff below against the coding style rules.
Return ONLY a JSON array of issues. If none, return [].

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
    review_plan.push(...issues);

    const count = issues.length;
    console.log(count > 0 ? `${count} issue(s)` : "clean");
  }

  return review_plan;
}

// ---------------------------------------------------------------------------
// Phase 2: Evaluation — audit the plan for gaps and quality
// ---------------------------------------------------------------------------

async function runEvaluationPhase(
  openai: OpenAI,
  review_plan: ReviewIssue[],
  styleRulesText: string,
): Promise<EvaluationItem[]> {
  if (review_plan.length === 0) {
    console.log("  No issues to evaluate — skipping.");
    return [];
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior code reviewer doing a quality audit. You only output valid JSON arrays — no prose, no markdown fences.",
      },
      {
        role: "user",
        content: `Audit the review_plan below against the coding style rules.

For EACH item in review_plan, decide:
  "keep"   — issue is valid and comment is well-phrased
  "modify" — issue is valid but comment needs improvement (provide revised_comment)
  "delete" — false positive or not a real violation

Also: if any HIGH severity style rules are clearly violated but MISSING from the plan, add new items with action "add".

Return ONLY a JSON array:
[{"file": string, "line": number, "action": "keep"|"modify"|"delete"|"add", "comment": string, "revised_comment": string|null}]

Style Rules:
${styleRulesText}

Review Plan:
${JSON.stringify(review_plan, null, 2)}`,
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  return parseJsonResponse<EvaluationItem[]>(content, []);
}

// ---------------------------------------------------------------------------
// Phase 3: Execution — post comments + save to memory
// ---------------------------------------------------------------------------

async function runExecutionPhase(
  review_plan: ReviewIssue[],
  evaluation_report: EvaluationItem[],
  prUrl: string,
): Promise<void> {
  const toPost = evaluation_report.filter((i) => i.action !== "delete");

  if (toPost.length === 0) {
    console.log("  Nothing to post.");
    return;
  }

  for (const item of toPost) {
    const body = item.revised_comment ?? item.comment;
    const severityLabel =
      review_plan.find((r) => r.file === item.file && r.line === item.line)?.severity ??
      "medium";

    try {
      const posted = await post_review_comment(prUrl, item.file, item.line, body);
      console.log(`  [${item.action.toUpperCase()}] ${item.file}:${item.line} → ${posted.url}`);

      addReviewError({
        prId: prUrl,
        file: item.file,
        line: item.line,
        errorType: "style-violation",
        description: item.comment,
        suggestion: body,
        severity: severityLabel as "low" | "medium" | "high",
      });
    } catch (err) {
      console.error(`  Failed to post on ${item.file}:${item.line} — ${String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║      PR Code Review Agent            ║");
  console.log("╚══════════════════════════════════════╝\n");

  // ── Step 1: Load memory ──────────────────────────────────────────────────
  console.log("Step 1 › Loading memory ...");
  const { highlightsLoaded, errorsLoaded, warnings } = await load_memory();
  console.log(`  ${highlightsLoaded} style rule(s), ${errorsLoaded} past error(s) loaded`);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);

  const highlights = getStyleHighlights();
  const styleRulesText = highlights
    .map((h) => `[${h.category} › ${h.rule}] ${h.description}`)
    .join("\n");

  // ── Step 2: Read PR diff ─────────────────────────────────────────────────
  console.log(`\nStep 2 › Fetching PR diff — ${PR_URL}`);
  const files = await read_pr_diff(PR_URL);
  const patchable = files.filter((f) => f.patch);
  console.log(`  ${files.length} file(s) changed — ${patchable.length} with patches`);

  if (patchable.length === 0) {
    console.log("\nNothing to review (no text patches). Exiting.");
    return;
  }

  const openai = getOpenAI();

  // ── Step 3: Planning phase ───────────────────────────────────────────────
  console.log("\nStep 3 › Planning phase — reviewing each file ...");
  const review_plan = await runPlanningPhase(openai, patchable, styleRulesText);

  console.log(`\n┌─ review_plan (${review_plan.length} issue(s)) ${"─".repeat(30)}`);
  console.log(JSON.stringify(review_plan, null, 2));
  console.log(`└${"─".repeat(50)}`);

  // ── Step 4: Evaluation phase ─────────────────────────────────────────────
  console.log("\nStep 4 › Evaluation phase — auditing for gaps & quality ...");
  const evaluation_report = await runEvaluationPhase(openai, review_plan, styleRulesText);

  console.log(`\n┌─ evaluation_report (${evaluation_report.length} item(s)) ${"─".repeat(25)}`);
  console.log(JSON.stringify(evaluation_report, null, 2));
  console.log(`└${"─".repeat(50)}`);

  const kept = evaluation_report.filter((i) => i.action !== "delete").length;
  const deleted = evaluation_report.filter((i) => i.action === "delete").length;
  const modified = evaluation_report.filter((i) => i.action === "modify").length;
  const added = evaluation_report.filter((i) => i.action === "add").length;
  console.log(`\n  Summary: ${kept} to post (${modified} modified, ${added} added), ${deleted} removed`);

  // ── Step 5: Execution phase ──────────────────────────────────────────────
  console.log("\nStep 5 › Execution phase — posting comments & saving to memory ...");
  await runExecutionPhase(review_plan, evaluation_report, PR_URL);

  console.log("\n✓ Review complete.");
}

main().catch((err: unknown) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
