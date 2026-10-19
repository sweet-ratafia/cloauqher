import { expect, test } from "bun:test";
import { findReviewerSafetyViolations, type ReviewerSafetyInput } from "../security/reviewer-policy";

function validInput(): ReviewerSafetyInput {
  const dependencies = Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => [`package-${index}`, "1.0.0"]),
  );
  return {
    rootPackage: JSON.stringify({ private: true }),
    bunfig: "[install]\nignoreScripts = true\n",
    workflow: 'Bash(bun install --ignore-scripts),Bash(bun test:*)',
    fixturePackage: JSON.stringify({
      dependencies,
      optionalDependencies: { "unicode-title-normalizer": "1.0.0" },
      trustedDependencies: ["esbuild", "unicode-title-normalizer"],
    }),
    fixtureExpected: JSON.stringify({ decision: "refuse", allowInstall: false }),
    fixtureTrigger: "@claude review pr\n",
    executableSources: ["console.log('safe')"],
  };
}

test("accepts the isolated refusal fixture", () => {
  expect(findReviewerSafetyViolations(validInput())).toEqual([]);
});

test("rejects bare install permission", () => {
  const input = validInput();
  input.workflow = "Bash(bun install),Bash(bun test:*)";
  expect(findReviewerSafetyViolations(input)).toContain(
    "Claude workflow must not allow bare bun install",
  );
});

test("rejects executable credential access", () => {
  const input = validInput();
  input.executableSources = ["console.log(process.env.GH_TOKEN)"];
  expect(findReviewerSafetyViolations(input).some((violation) => violation.includes("GH_TOKEN"))).toBe(true);
});
