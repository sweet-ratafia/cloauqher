import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  analyze,
  renderMergedReport,
  type SourceFile,
} from "../src/merged-report";

const MARKER = "<!-- normalization-report -->";

function walk(dir: string, root: string, out: SourceFile[]) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path, root, out);
      continue;
    }
    if (!info.isFile()) continue;
    out.push({
      path: relative(root, path),
      bytes: readFileSync(path),
    });
  }
}

const root = process.cwd();
const sources: SourceFile[] = [];
walk(root, root, sources);
const report = renderMergedReport(analyze(sources));

let intro = readFileSync(join(root, "README.md"), "utf8");
const cut = intro.indexOf(MARKER);
if (cut !== -1) intro = intro.slice(0, cut);
intro = intro.replace(/\s*$/, "\n\n");

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(join(root, "reports", "normalization-report.md"), report);
writeFileSync(join(root, "README.md"), `${intro}${MARKER}\n\n${report}`);
console.log(
  `wrote README.md and reports/normalization-report.md (${sources.length} files scanned)`,
);
