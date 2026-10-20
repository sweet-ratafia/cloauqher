import { readFileSync } from "node:fs";
import { join } from "node:path";

const SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

type Manifest = Partial<
  Record<(typeof SECTIONS)[number], Record<string, string>>
>;

type Result =
  | {
      name: string;
      section: string;
      spec: string;
      status: "ok";
      latest: string;
    }
  | {
      name: string;
      section: string;
      spec: string;
      status: "outdated";
      latest: string;
    }
  | {
      name: string;
      section: string;
      spec: string;
      status: "skipped";
      reason: string;
    }
  | {
      name: string;
      section: string;
      spec: string;
      status: "error";
      reason: string;
    };

const registry = (
  process.env.NPM_CONFIG_REGISTRY ??
  process.env.npm_config_registry ??
  "https://registry.npmjs.org"
).replace(/\/+$/, "");

async function fetchLatest(name: string): Promise<string> {
  const url = `${registry}/${name.replace("/", "%2f")}`;
  const res = await fetch(url, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  const doc = (await res.json()) as { "dist-tags"?: { latest?: string } };
  const latest = doc["dist-tags"]?.latest;
  if (!latest) throw new Error(`no "latest" dist-tag at ${url}`);
  return latest;
}

async function check(
  section: string,
  name: string,
  spec: string,
): Promise<Result> {
  let pkg = name;
  let range = spec;
  if (spec.startsWith("npm:")) {
    const alias = spec.slice(4);
    const at = alias.lastIndexOf("@");
    if (at <= 0) {
      return {
        name,
        section,
        spec,
        status: "skipped",
        reason: "alias without version",
      };
    }
    pkg = alias.slice(0, at);
    range = alias.slice(at + 1);
  }
  if (/^(workspace|file|link|git|github|https?):|\//.test(range)) {
    return {
      name,
      section,
      spec,
      status: "skipped",
      reason: "not a registry version",
    };
  }

  try {
    const latest = await fetchLatest(pkg);
    const upToDate = range === "latest" || Bun.semver.satisfies(latest, range);
    return upToDate
      ? { name, section, spec, status: "ok", latest }
      : { name, section, spec, status: "outdated", latest };
  } catch (err) {
    return {
      name,
      section,
      spec,
      status: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as Manifest;

const jobs: Promise<Result>[] = [];
for (const section of SECTIONS) {
  for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
    jobs.push(check(section, name, spec));
  }
}
const results = await Promise.all(jobs);

for (const r of results) {
  const label = `${r.name}@${r.spec} (${r.section})`;
  switch (r.status) {
    case "ok":
      console.log(`ok        ${label}`);
      break;
    case "outdated":
      console.log(`OUTDATED  ${label} -> latest is ${r.latest}`);
      break;
    case "skipped":
      console.log(`skipped   ${label}: ${r.reason}`);
      break;
    case "error":
      console.log(`ERROR     ${label}: ${r.reason}`);
      break;
  }
}

const outdated = results.filter((r) => r.status === "outdated").length;
const errors = results.filter((r) => r.status === "error").length;
console.log(
  `\n${results.length} dependencies checked against ${registry}: ${outdated} outdated, ${errors} errors`,
);
if (outdated > 0 || errors > 0) process.exit(1);
