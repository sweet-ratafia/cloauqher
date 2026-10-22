/**
 * Find .zip files and write formatted .txt entries into workspace/.
 *
 * Usage (from the repo root):
 *   bun run format:zip-txt
 *   bun run format:zip-txt -- /path/to/source
 *
 * The reader is the local package `analyse-zip-then-rezip-txt`, which is the
 * module that will be published on npm.
 */
import { join } from "node:path";
import {
  formatZipTxtWorkspace,
  loadZipArchives,
} from "../src/zip-txt-workspace";

const sourceDir = process.argv[2] ?? process.cwd();
const workspaceDir = join(process.cwd(), "workspace");
const archives = loadZipArchives(sourceDir);
const result = formatZipTxtWorkspace({ workspaceDir, archives });

console.log(
  `formatted ${result.files.length} txt file(s) from ${archives.length} zip archive(s) into workspace/`,
);
for (const skipped of result.skipped) {
  const entry = skipped.entry ? ` ${skipped.entry}` : "";
  console.log(`skipped ${skipped.archive}${entry}: ${skipped.reason}`);
}
