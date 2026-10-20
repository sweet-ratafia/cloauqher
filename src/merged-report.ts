import { findColors } from "./colors";
import { extractFields, normalizeField, type TextField } from "./fields";
import { checkSyntax, type SyntaxIssue } from "./syntax-check";
import { decodeText, isTextLike, shouldSkip, textKind } from "./text-files";

export type SourceFile = {
  path: string;
  bytes: Uint8Array;
};

export type FieldChange = {
  file: string;
  field: string;
  before: string;
  after: string;
};

export type ColorChange = {
  file: string;
  before: string;
  after: string;
};

export type DetectedFile = {
  path: string;
  kind: string;
};

export type MergedReport = {
  files: DetectedFile[];
  fields: FieldChange[];
  colors: ColorChange[];
  syntax: SyntaxIssue[];
};

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "\\n");
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(cell).join(" | ")} |`);
  return [head, rule, ...body].join("\n");
}

export function analyze(sources: SourceFile[]): MergedReport {
  const files: DetectedFile[] = [];
  const fields: FieldChange[] = [];
  const colors: ColorChange[] = [];
  const syntax: SyntaxIssue[] = [];

  for (const source of [...sources].sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    if (shouldSkip(source.path) || !isTextLike(source.path, source.bytes))
      continue;
    files.push({ path: source.path, kind: textKind(source.path) });

    let text: string;
    try {
      text = decodeText(source.bytes);
    } catch {
      syntax.push({ file: source.path, message: "invalid UTF-8" });
      continue;
    }
    syntax.push(...checkSyntax(source.path, text));

    for (const color of findColors(text)) {
      colors.push({ file: source.path, ...color });
    }

    let extracted: TextField[] = [];
    try {
      extracted = extractFields(source.path, text);
    } catch {
      syntax.push({ file: source.path, message: "field extraction failed" });
    }
    for (const field of extracted) {
      let after: string;
      try {
        after = normalizeField(field);
      } catch (error) {
        syntax.push({
          file: field.file,
          message:
            error instanceof Error
              ? error.message
              : "field normalization failed",
        });
        continue;
      }
      if (after !== field.value) {
        fields.push({
          file: field.file,
          field: field.field,
          before: field.value,
          after,
        });
      }
    }
  }

  return { files, fields, colors, syntax };
}

export function renderMergedReport(report: MergedReport): string {
  const fileRows = report.files.map((file) => [file.path, file.kind]);
  const fieldRows = report.fields.map((field) => [
    field.file,
    field.field,
    field.before,
    field.after,
  ]);
  const colorRows = report.colors.map((color) => [
    color.file,
    color.before,
    color.after,
  ]);
  const syntaxRows = report.syntax.map((issue) => [issue.file, issue.message]);

  return [
    "# Merged normalization report",
    "",
    "This report merges text-file detection, Unicode field normalization, color canonicalization, and text syntax checking.",
    "Source files are not rewritten. Rows are proposals.",
    "",
    "## Summary",
    "",
    `- Text-like files: ${report.files.length}`,
    `- Fields that would change: ${report.fields.length}`,
    `- Colors that would change: ${report.colors.length}`,
    `- Syntax issues: ${report.syntax.length}`,
    "",
    "## Text-like files",
    "",
    fileRows.length
      ? table(["Path", "Kind"], fileRows)
      : "No text-like files detected.",
    "",
    "## Field normalization",
    "",
    "String fields are Unicode-normalized (NFKC). Format characters are removed.",
    "Headings, `.txt` lines, and fields named title, description, summary, heading, or label are title-cased.",
    "Color-like fields and inline `#hex`, `rgb()`, and `hsl()` values are canonicalized to `#rrggbb`.",
    "A short all-digit token such as `#123` is left alone so issue references stay issue references.",
    "",
    fieldRows.length
      ? table(["File", "Field", "Before", "After"], fieldRows)
      : "No field changes.",
    "",
    "## Colors",
    "",
    colorRows.length
      ? table(["File", "Value", "Canonical"], colorRows)
      : "No color changes.",
    "",
    "## Syntax",
    "",
    syntaxRows.length
      ? table(["File", "Issue"], syntaxRows)
      : "No syntax issues.",
    "",
  ].join("\n");
}
