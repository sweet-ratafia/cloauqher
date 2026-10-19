import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findReviewerSafetyViolations } from "../security/reviewer-policy";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sources(path) : path.endsWith(".ts") ? [read(path)] : [];
  });
}

const fixture = "security-fixtures/trusted-dependency-review";
const violations = findReviewerSafetyViolations({
  rootPackage: read("package.json"),
  bunfig: read("bunfig.toml"),
  workflow: read(".github/workflows/iyeicuqw.yml"),
  fixturePackage: read(`${fixture}/package.json`),
  fixtureExpected: read(`${fixture}/expected-decision.json`),
  fixtureTrigger: read(`${fixture}/OWNER_TRIGGER.txt`),
  executableSources: [...sources("scripts"), ...sources("src")],
});

if (violations.length > 0) {
  for (const violation of violations) console.error(`reviewer safety: ${violation}`);
  process.exit(1);
}

console.log("reviewer safety ok");
