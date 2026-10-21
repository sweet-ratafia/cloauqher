import { canonicalizeColors, canonicalColor, isColorField } from "./colors";
import { extension } from "./text-files";
import { normalizeTitle } from "./unicode-title-normalizer.js";

export type TextField = {
  file: string;
  field: string;
  value: string;
  prose: boolean;
};

const PROSE_KEYS = new Set([
  "title",
  "description",
  "summary",
  "heading",
  "label",
]);
const KEY_VALUE = /^\s*(?:-\s*)?([A-Za-z_][\w.-]*)\s*[:=]\s*(.*)$/;

function normalizePlain(value: string): string {
  return canonicalizeColors(
    // eslint-disable-next-line no-control-regex -- NUL is removed on purpose
    value.replace(/[\p{Cf}\u0000]/gu, "").normalize("NFKC"),
  );
}

function finalKey(path: string): string {
  return (
    path
      .replace(/:\d+$/, "")
      .split(/[.[]/)
      .at(-1)
      ?.replace(/\]$/, "")
      .toLowerCase() ?? ""
  );
}

function isProseField(path: string): boolean {
  return PROSE_KEYS.has(finalKey(path));
}

function stripTrailingComment(value: string): string {
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote === '"' && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !escaped) {
      quote = quote === char ? null : (quote ?? char);
    } else if (char === "#" && quote === null) {
      return value.slice(0, index).trimEnd();
    }
    escaped = false;
  }
  return value;
}

export function normalizeField(field: TextField): string {
  if (isColorField(field.field)) {
    const normalized = canonicalColor(field.value);
    if (normalized === null) {
      throw new Error(`invalid color value for ${field.field}`);
    }
    return normalized;
  }
  if (field.prose) {
    return normalizeTitle(field.value, {
      form: "NFKC",
      titleCase: true,
      colors: true,
    });
  }
  return normalizePlain(field.value);
}

function jsonFields(
  file: string,
  value: unknown,
  path: string,
  out: TextField[],
  depth = 0,
) {
  if (depth > 64) return;
  if (typeof value === "string") {
    out.push({
      file,
      field: path || "$",
      value,
      prose: isProseField(path),
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      jsonFields(file, item, `${path}[${index}]`, out, depth + 1),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      jsonFields(file, child, next, out, depth + 1);
    }
  }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function keyValueFields(file: string, text: string): TextField[] {
  const fields: TextField[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*#/.test(line)) return;
    const match = KEY_VALUE.exec(line);
    if (!match) return;
    const key = match[1] ?? "";
    const raw = stripTrailingComment((match[2] ?? "").trim());
    if (!raw || raw === "|" || raw === ">") return;
    fields.push({
      file,
      field: `${key}:${index + 1}`,
      value: stripQuotes(raw),
      prose: isProseField(key),
    });
  });
  return fields;
}

function markdownFields(file: string, text: string): TextField[] {
  const fields: TextField[] = [];
  let inFence = false;
  text.split(/\r?\n/).forEach((line, lineIndex) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) {
      const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (!heading) return;
      fields.push({
        file,
        field: `heading:${lineIndex + 1}`,
        value: heading[2] ?? "",
        prose: true,
      });
    }
  });
  return fields;
}

function textLines(file: string, text: string): TextField[] {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const value = line.trim();
    if (!value) return [];
    return [
      {
        file,
        field: `line:${index + 1}`,
        value,
        prose: true,
      },
    ];
  });
}

export function extractFields(file: string, text: string): TextField[] {
  const ext = extension(file);
  if (ext === ".json") {
    try {
      const fields: TextField[] = [];
      jsonFields(file, JSON.parse(text), "", fields);
      return fields;
    } catch {
      return [];
    }
  }
  if (ext === ".md") return markdownFields(file, text);
  if (ext === ".txt") return textLines(file, text);
  if (ext === ".yml" || ext === ".yaml" || ext === ".toml") {
    return keyValueFields(file, text);
  }
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    return [];
  }
  return keyValueFields(file, text);
}
