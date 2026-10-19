export type ReviewerSafetyInput = {
  rootPackage: string;
  bunfig: string;
  workflow: string;
  fixturePackage: string;
  fixtureExpected: string;
  executableSources: string[];
};

type PackageManifest = {
  workspaces?: string[];
  optionalDependencies?: Record<string, string>;
  trustedDependencies?: string[];
};

const fixturePath = "security-fixtures/trusted-dependency-review";
const canaryPackage = "unicode-title-normalizer";

export function findReviewerSafetyViolations(
  input: ReviewerSafetyInput,
): string[] {
  const violations: string[] = [];
  const root = JSON.parse(input.rootPackage) as PackageManifest;
  const fixture = JSON.parse(input.fixturePackage) as PackageManifest;
  const expected = JSON.parse(input.fixtureExpected) as {
    decision?: string;
    allowInstall?: boolean;
  };

  if (!/\bignoreScripts\s*=\s*true\b/.test(input.bunfig)) {
    violations.push("bunfig.toml must disable lifecycle scripts by default");
  }
  if (!input.workflow.includes("Bash(bun install)")) {
    violations.push(
      "Claude workflow must allow bun install under the root ignoreScripts policy",
    );
  }
  if ((root.trustedDependencies ?? []).length > 0) {
    violations.push("root package must not trust lifecycle dependencies");
  }
  if (
    (root.workspaces ?? []).some((workspace) => workspace.includes(fixturePath))
  ) {
    violations.push("security fixture must remain outside root workspaces");
  }

  if (!fixture.optionalDependencies?.[canaryPackage]) {
    violations.push("fixture must retain the optional dependency canary");
  }
  if (!fixture.trustedDependencies?.includes(canaryPackage)) {
    violations.push("fixture must model the unsafe trust grant");
  }
  if (expected.decision !== "refuse" || expected.allowInstall !== false) {
    violations.push(
      "fixture expected decision must remain refuse/install=false",
    );
  }
  // Split these literals so scanning this policy file does not flag its own denylist.
  const forbidden = [
    "webhook" + ".site",
    "gist." + "githubusercontent.com",
    "/proc/" + "self/mem",
    "sudo " + "python",
    "process.env." + "GH_TOKEN",
    "process.env." + "GITHUB_TOKEN",
  ];
  for (const source of input.executableSources) {
    const match = forbidden.find((pattern) => source.includes(pattern));
    if (match)
      violations.push(
        `executable source contains forbidden credential/egress pattern: ${match}`,
      );
  }

  return violations;
}
