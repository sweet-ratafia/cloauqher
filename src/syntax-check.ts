import { extension } from "./text-files";

export type SyntaxIssue = {
  file: string;
  message: string;
};

export function checkSyntax(file: string, text: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  if (text.includes("\u0000"))
    issues.push({ file, message: "contains a NUL byte" });
  if (/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    issues.push({ file, message: "contains ASCII control characters" });
  }

  const ext = extension(file);
  if (ext === ".json") {
    try {
      JSON.parse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "parse failed";
      issues.push({ file, message: `invalid JSON: ${message}` });
    }
  }

  if (ext === ".md") {
    const fences = text.match(/^```/gm);
    if ((fences?.length ?? 0) % 2 === 1) {
      issues.push({ file, message: "unclosed markdown code fence" });
    }
  }

  if (ext === ".yml" || ext === ".yaml" || ext === ".toml") {
    text.split(/\r?\n/).forEach((line, index) => {
      if (/^\t/.test(line)) {
        issues.push({ file, message: `line ${index + 1}: tab indentation` });
      }
      const code = line.replace(/(^|[^\\])#.*/, "$1");
      const quotes = code.match(/(?<!\\)"/g);
      if ((quotes?.length ?? 0) % 2 === 1) {
        issues.push({
          file,
          message: `line ${index + 1}: unbalanced double quote`,
        });
      }
    });
  }

  return issues;
}
