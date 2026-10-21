import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { analyseZip, type ZipEntry } from "analyse-zip-then-rezip-txt";
import { normalizeField } from "./fields";
import { shouldSkip } from "./text-files";

export type ZipArchive = {
  name: string;
  bytes: Uint8Array;
};

export type FormattedZipTxtFile = {
  archive: string;
  entry: string;
  workspaceFile: string;
  outputPath: string;
  reportPath: string;
  before: string;
  after: string;
  changed: boolean;
  warnings: string[];
};

export type SkippedZipTxt = {
  archive: string;
  entry: string;
  reason: string;
};

export type ZipTxtWorkspaceResult = {
  files: FormattedZipTxtFile[];
  skipped: SkippedZipTxt[];
};

export type FormattedTxt = {
  text: string;
  warnings: string[];
};

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "\\n");
}

function isInside(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function archiveKey(name: string): string {
  const withoutExt = name.replaceAll("\\", "/").replace(/\.zip$/i, "");
  const parts = withoutExt
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");
  const key = parts.join("__").replace(/[^A-Za-z0-9._-]+/g, "_");
  return key || "archive";
}

function uniqueKey(name: string, used: Set<string>): string {
  const base = archiveKey(name);
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
}

/**
 * Title-case prose lines and canonicalize colors, matching field extraction.
 * Blank lines and the original newline style are kept.
 */
export function formatTxtContent(text: string): FormattedTxt {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const endsWithNewline = text.endsWith("\n");
  const lines = text.split(/\r?\n/);
  if (endsWithNewline) lines.pop();
  const warnings: string[] = [];
  const formatted = lines.map((line, index) => {
    const value = line.trim();
    if (!value) return line;
    try {
      return normalizeField({
        file: "entry.txt",
        field: `line:${index + 1}`,
        value,
        prose: true,
      });
    } catch (error) {
      warnings.push(
        `line ${index + 1}: ${
          error instanceof Error ? error.message : "normalization failed"
        }`,
      );
      return line;
    }
  });
  return {
    text: formatted.join(newline) + (endsWithNewline ? newline : ""),
    warnings,
  };
}

export function findZipFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry);
      if (shouldSkip(relative(root, path))) continue;
      let info: ReturnType<typeof lstatSync>;
      try {
        info = lstatSync(path);
      } catch {
        continue;
      }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        walk(path);
        continue;
      }
      if (info.isFile() && entry.toLowerCase().endsWith(".zip")) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

export function loadZipArchives(sourceDir: string): ZipArchive[] {
  return findZipFiles(sourceDir).map((file) => ({
    name: relative(sourceDir, file),
    bytes: readFileSync(file),
  }));
}

function skipReason(entry: ZipEntry): string | null {
  if (!entry.txt || entry.directory) return null;
  if (entry.error || entry.text === null) {
    return entry.textError ?? entry.error ?? "no text";
  }
  if (!entry.safePath) return "unsafe zip path";
  return null;
}

function renderSummary(result: ZipTxtWorkspaceResult): string {
  const fileRows = result.files.map((file) => [
    file.archive,
    file.entry,
    file.workspaceFile,
    file.changed ? "yes" : "no",
  ]);
  const skippedRows = result.skipped.map((item) => [
    item.archive,
    item.entry || "(archive)",
    item.reason,
  ]);
  const table = (headers: string[], rows: string[][]) =>
    [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
    ].join("\n");

  return [
    "# Formatted zip text",
    "",
    "`.txt` entries were read with `analyse-zip-then-rezip-txt`.",
    "Prose lines are Unicode-normalized (NFKC) and title-cased.",
    "Color values are rewritten as `#rrggbb`.",
    "Paths that could escape the workspace are skipped.",
    "",
    "## Files",
    "",
    fileRows.length
      ? table(["Archive", "Entry", "Workspace file", "Changed"], fileRows)
      : "No .txt entries written.",
    "",
    "## Skipped",
    "",
    skippedRows.length
      ? table(["Archive", "Entry", "Reason"], skippedRows)
      : "Nothing skipped.",
    "",
    "## Line warnings",
    "",
    result.files.some((file) => file.warnings.length > 0)
      ? table(
          ["Archive", "Entry", "Warning"],
          result.files.flatMap((file) =>
            file.warnings.map((warning) => [
              file.archive,
              file.entry,
              warning,
            ]),
          ),
        )
      : "No line warnings.",
    "",
  ].join("\n");
}

export function formatZipTxtWorkspace(options: {
  workspaceDir: string;
  archives: ZipArchive[];
  write?: boolean;
}): ZipTxtWorkspaceResult {
  const write = options.write !== false;
  const files: FormattedZipTxtFile[] = [];
  const skipped: SkippedZipTxt[] = [];
  const usedKeys = new Set<string>();
  const archiveDirs = new Set<string>();

  for (const archive of options.archives) {
    let entries: ZipEntry[];
    try {
      entries = analyseZip(archive.bytes);
    } catch (error) {
      skipped.push({
        archive: archive.name,
        entry: "",
        reason: error instanceof Error ? error.message : "unreadable zip",
      });
      continue;
    }

    const key = uniqueKey(archive.name, usedKeys);
    archiveDirs.add(key);
    const seen = new Set<string>();
    for (const entry of entries) {
      const reason = skipReason(entry);
      if (reason) {
        skipped.push({ archive: archive.name, entry: entry.name, reason });
        continue;
      }
      if (!entry.txt || entry.text === null || !entry.safePath) continue;
      if (seen.has(entry.safePath)) {
        skipped.push({
          archive: archive.name,
          entry: entry.name,
          reason: "duplicate txt path",
        });
        continue;
      }
      seen.add(entry.safePath);

      const formatted = formatTxtContent(entry.text);
      const workspaceFile = `${key}/${entry.safePath}`;
      const outputPath = join(options.workspaceDir, key, entry.safePath);
      if (!isInside(options.workspaceDir, outputPath)) {
        skipped.push({
          archive: archive.name,
          entry: entry.name,
          reason: "unsafe zip path",
        });
        continue;
      }
      files.push({
        archive: archive.name,
        entry: entry.name,
        workspaceFile,
        outputPath,
        reportPath: `zip-txt/${workspaceFile}`,
        before: entry.text,
        after: formatted.text,
        changed: formatted.text !== entry.text,
        warnings: formatted.warnings,
      });
    }
  }

  if (write) {
    mkdirSync(options.workspaceDir, { recursive: true });
    for (const key of archiveDirs) {
      const archiveDir = join(options.workspaceDir, key);
      if (!isInside(options.workspaceDir, archiveDir)) continue;
      rmSync(archiveDir, { recursive: true, force: true });
    }
    for (const file of files) {
      if (!isInside(options.workspaceDir, file.outputPath)) continue;
      mkdirSync(dirname(file.outputPath), { recursive: true });
      writeFileSync(file.outputPath, file.after);
    }
    writeFileSync(
      join(options.workspaceDir, "zip-txt.md"),
      renderSummary({ files, skipped }),
    );
  }

  return { files, skipped };
}
