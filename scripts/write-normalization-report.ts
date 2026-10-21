import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { format } from "prettier";
import {
  analyze,
  renderMergedReport,
  type SourceFile,
} from "../src/merged-report";
import { shouldSkip } from "../src/text-files";
import {
  formatZipTxtWorkspace,
  loadZipArchives,
} from "../src/zip-txt-workspace";

function walk(dir: string, root: string, out: SourceFile[]) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const sourcePath = relative(root, path);
    if (shouldSkip(sourcePath)) continue;
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path, root, out);
      continue;
    }
    if (!info.isFile()) continue;
    out.push({
      path: sourcePath,
      bytes: readFileSync(path),
    });
  }
}

const root = process.cwd();
const sources: SourceFile[] = [];
walk(root, root, sources);
const zipTxt = formatZipTxtWorkspace({
  workspaceDir: join(root, "workspace"),
  archives: loadZipArchives(root),
});
for (const file of zipTxt.files) {
  sources.push({
    path: file.reportPath,
    bytes: Buffer.from(file.before, "utf8"),
  });
}
const report = await format(renderMergedReport(analyze(sources)), {
  parser: "markdown",
});

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(join(root, "reports", "normalization-report.md"), report);
console.log(
  `wrote reports/normalization-report.md (${sources.length} files scanned)`,
);
