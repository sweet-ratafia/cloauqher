import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Manifest = {
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  trustedDependencies?: string[];
};

const root = join(import.meta.dir, "..");

function manifest(path: string): Manifest {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as Manifest;
}

test("disables lifecycle scripts for the trusted tsc collision", () => {
  const rootManifest = manifest("package.json");
  expect(rootManifest.dependencies).toMatchObject({
    "git-crt-creator": "1.0.2",
    "nativescript-toolbox": "3.0.1",
  });
  expect(rootManifest.trustedDependencies).toEqual(["nativescript-toolbox"]);
  expect(rootManifest.scripts?.typecheck).toBe(
    "bun node_modules/typescript/bin/tsc --noEmit",
  );
  expect(rootManifest.scripts?.["install:safe"]).toBe(
    "bun install --frozen-lockfile --ignore-scripts",
  );

  const bunfig = readFileSync(join(root, "bunfig.toml"), "utf8");
  expect(bunfig).toMatch(/^ignoreScripts\s*=\s*true$/m);
  expect(bunfig).toMatch(/^frozenLockfile\s*=\s*true$/m);
  expect(readFileSync(join(root, ".npmrc"), "utf8")).toMatch(
    /^ignore-scripts=true$/m,
  );

  const toolbox = manifest("node_modules/nativescript-toolbox/package.json");
  const gitCrtCreator = manifest("node_modules/git-crt-creator/package.json");
  expect(toolbox.scripts?.postinstall).toBe("tsc");
  expect(gitCrtCreator.bin?.tsc).toBe("./index.js");
});
