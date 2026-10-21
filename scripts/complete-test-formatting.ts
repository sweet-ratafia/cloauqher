/**
 * Complete formatting test.
 *
 * Usage (from the repo root):
 *   bun run complete-test-formatting
 *
 * Runs `bun install`, then `bun test tests/`, then validates the test
 * summary: a zero exit status, a parsed pass count, and zero failures.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

type StepResult = {
  status: number | null;
  output: string;
};

function run(args: string[]): StepResult {
  console.log(`\n$ bun ${args.join(" ")}`);
  const result = spawnSync("bun", args, {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  if (result.error) {
    console.error(result.error.message);
  }
  return { status: result.status, output };
}

function parseTestSummary(output: string): { pass: number; fail: number } | null {
  const pass = output.match(/^\s*(\d+)\s+pass\b/m);
  const fail = output.match(/^\s*(\d+)\s+fail\b/m);
  if (!pass || !fail) return null;
  return { pass: Number(pass[1]), fail: Number(fail[1]) };
}

const install = run(["install"]);
if (install.status !== 0) {
  console.error("\ncomplete-test-formatting: bun install failed");
  process.exit(install.status ?? 1);
}

const tests = run(["test", "tests/"]);
const summary = parseTestSummary(tests.output);
const valid =
  tests.status === 0 &&
  summary !== null &&
  summary.pass > 0 &&
  summary.fail === 0;

if (!valid) {
  const detail = summary
    ? `${summary.pass} pass, ${summary.fail} fail, exit ${tests.status}`
    : `could not parse the test summary (exit ${tests.status})`;
  console.error(`\ncomplete-test-formatting: results invalid — ${detail}`);
  process.exit(tests.status && tests.status !== 0 ? tests.status : 1);
}

console.log(
  `\ncomplete-test-formatting: validated ${summary.pass} passed, 0 failed`,
);
