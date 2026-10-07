import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

export type AthGzipHugeFileStageManifest = {
  name: string;
  version: string;
  stub: boolean;
  description: string;
  scripts?: Record<string, string>;
};

const require = createRequire(import.meta.url);

export function readAthGzipHugeFileStageManifest(): AthGzipHugeFileStageManifest {
  const manifestPath = require.resolve("ath-gziphugefile/package.json");
  return JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as AthGzipHugeFileStageManifest;
}
