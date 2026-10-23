const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".svg",
  ".xml",
  ".csv",
]);

const TEXT_BASENAMES = new Set([
  "license",
  "makefile",
  "dockerfile",
  ".gitignore",
  ".prettierignore",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".github",
  ".claude",
  "node_modules",
  ".bun-cache",
  "reports",
  "workspace",
]);
const SKIP_FILES = new Set(["package-lock.json", "bun.lockb", "README.md"]);

export function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] ?? path;
}

export function extension(path: string): string {
  const base = basename(path);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

export function shouldSkip(path: string): boolean {
  const parts = path.split(/[/\\]/);
  if (parts.some((part) => SKIP_DIRS.has(part))) return true;
  return SKIP_FILES.has(basename(path));
}

export function isProbablyText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function isTextLike(path: string, bytes: Uint8Array): boolean {
  const ext = extension(path);
  const known =
    TEXT_EXTENSIONS.has(ext) ||
    TEXT_BASENAMES.has(basename(path).toLowerCase());
  // An empty file is text only when its name is already a known text file.
  // An empty README is included; an empty file with no extension is not.
  if (bytes.length === 0) return known;
  if (!isProbablyText(bytes)) return false;
  if (known) return true;
  return ext === "";
}

export function textKind(path: string): string {
  const ext = extension(path);
  if (ext === ".md") return "markdown";
  if (ext === ".json") return "json";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  if (ext === ".toml") return "toml";
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext))
    return "code";
  if (ext === ".txt") return "text";
  return "text";
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
