import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const APPROVED_TRUSTED_DEPENDENCIES = new Set([
  "ath-gziphugefile",
  "esbuild",
  "prettier",
  "sharp",
]);

const REQUIRED_TRUSTED_VERSIONS = new Map([
  ["ath-gziphugefile", "0.0.0-stage"],
]);

type Manifest = Partial<
  Record<(typeof DEPENDENCY_SECTIONS)[number], Record<string, string>>
> & {
  trustedDependencies?: unknown;
};

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as Manifest;

if (
  manifest.trustedDependencies !== undefined &&
  !Array.isArray(manifest.trustedDependencies)
) {
  console.error("trustedDependencies must be an array");
  process.exit(1);
}

const trustedDependencies = manifest.trustedDependencies ?? [];
const declaredDependencies = new Set(
  DEPENDENCY_SECTIONS.flatMap((section) =>
    Object.keys(manifest[section] ?? {}),
  ),
);
const errors: string[] = [];

for (const name of trustedDependencies) {
  if (typeof name !== "string") {
    errors.push("trustedDependencies entries must be strings");
    continue;
  }
  if (!APPROVED_TRUSTED_DEPENDENCIES.has(name)) {
    errors.push(`unapproved trusted dependency: ${name}`);
  }
  if (!declaredDependencies.has(name)) {
    errors.push(`trusted dependency is not declared: ${name}`);
  }

  const requiredVersion = REQUIRED_TRUSTED_VERSIONS.get(name);
  if (requiredVersion !== undefined) {
    const declaredVersion = DEPENDENCY_SECTIONS.map(
      (section) => manifest[section]?.[name],
    ).find((version) => version !== undefined);
    if (declaredVersion !== requiredVersion) {
      errors.push(
        `${name} must remain pinned to ${requiredVersion}, found ${declaredVersion ?? "no version"}`,
      );
    }
  }
}

for (const error of errors) console.error(`ERROR  ${error}`);
if (errors.length > 0) process.exit(1);

console.log(
  `ok  ${trustedDependencies.length} trusted dependencies match the approved allow-list`,
);
