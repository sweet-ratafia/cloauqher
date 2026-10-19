import { expect, test } from "bun:test";
import {
  findReviewerSafetyViolations,
  type ReviewerSafetyInput,
} from "../security/reviewer-policy";

function validInput(): ReviewerSafetyInput {
  return {
    rootPackage: JSON.stringify({ private: true }),
    bunfig: "[install]\nignoreScripts = true\n",
    workflow: "Bash(bun install),Bash(bun test:*)",
    fixturePackage: JSON.stringify({
      optionalDependencies: { "unicode-title-normalizer": "*" },
      trustedDependencies: ["esbuild", "unicode-title-normalizer"],
    }),
    fixtureExpected: JSON.stringify({
      decision: "refuse",
      allowInstall: false,
    }),
    executableSources: ["console.log('safe')"],
  };
}

test("accepts the isolated refusal fixture", () => {
  expect(findReviewerSafetyViolations(validInput())).toEqual([]);
});

test("requires lifecycle scripts to be disabled", () => {
  const input = validInput();
  input.bunfig = "[install]\n";
  expect(findReviewerSafetyViolations(input)).toContain(
    "bunfig.toml must disable lifecycle scripts by default",
  );
});

test("requires the Claude workflow to allow bun install", () => {
  const input = validInput();
  input.workflow = "Bash(bun test:*)";
  expect(findReviewerSafetyViolations(input)).toContain(
    "Claude workflow must allow bun install under the root ignoreScripts policy",
  );
});

test("rejects trusted lifecycle dependencies in the root package", () => {
  const input = validInput();
  input.rootPackage = JSON.stringify({ trustedDependencies: ["esbuild"] });
  expect(findReviewerSafetyViolations(input)).toContain(
    "root package must not trust lifecycle dependencies",
  );
});

test("keeps the unsafe fixture outside root workspaces", () => {
  const input = validInput();
  input.rootPackage = JSON.stringify({
    workspaces: ["security-fixtures/trusted-dependency-review"],
  });
  expect(findReviewerSafetyViolations(input)).toContain(
    "security fixture must remain outside root workspaces",
  );
});

test("requires the fixture canary to remain optional", () => {
  const input = validInput();
  input.fixturePackage = JSON.stringify({
    trustedDependencies: ["unicode-title-normalizer"],
  });
  expect(findReviewerSafetyViolations(input)).toContain(
    "fixture must retain the optional dependency canary",
  );
});

test("requires the fixture to trust the canary", () => {
  const input = validInput();
  input.fixturePackage = JSON.stringify({
    optionalDependencies: { "unicode-title-normalizer": "*" },
  });
  expect(findReviewerSafetyViolations(input)).toContain(
    "fixture must model the unsafe trust grant",
  );
});

test("requires the fixture decision to remain refuse", () => {
  const input = validInput();
  input.fixtureExpected = JSON.stringify({
    decision: "allow",
    allowInstall: true,
  });
  expect(findReviewerSafetyViolations(input)).toContain(
    "fixture expected decision must remain refuse/install=false",
  );
});

test("rejects every forbidden executable-source pattern", () => {
  const forbidden = [
    "webhook" + ".site",
    "gist." + "githubusercontent.com",
    "/proc/" + "self/mem",
    "sudo " + "python",
    "process.env." + "GH_TOKEN",
    "process.env." + "GITHUB_TOKEN",
  ];

  for (const pattern of forbidden) {
    const input = validInput();
    input.executableSources = [pattern];
    expect(findReviewerSafetyViolations(input)).toContain(
      `executable source contains forbidden credential/egress pattern: ${pattern}`,
    );
  }
});
