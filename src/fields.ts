import { canonicalizeColors, canonicalColor, isColorField } from "./colors";
import { extension } from "./text-files";
import { normalizeTitle } from "./unicode-title-normalizer.js";

export type TextField = {
  file: string;
  field: string;
  value: string;
  prose: boolean;
};

const PROSE_KEY = /(title|description|summary|heading|label)$/i;
const KEY_VALUE = /^\s*(?:-\s*)?([A-Za-z_][\w.-]*)\s*[:=]\s*(.*)$/;

function normalizePlain(value: string): string {
  return canonicalizeColors(
    value.replace(/[\p{Cf}\u0000]/gu, "").normalize("NFKC"),
  );
}

export function normalizeField(field: TextField): string {
  if (isColorField(field.field)) {
    return canonicalColor(field.value) ?? normalizePlain(field.value);
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
) {
  if (typeof value === "string") {
    out.push({
      file,
      field: path || "$",
      value,
      prose: PROSE_KEY.test(path),
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      jsonFields(file, item, `${path}[${index}]`, out),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      jsonFields(file, child, next, out);
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
    const raw = (match[2] ?? "").trim();
    if (!raw || raw === "|" || raw === ">") return;
    fields.push({
      file,
      field: `${key}:${index + 1}`,
      value: stripQuotes(raw),
      prose: PROSE_KEY.test(key),
    });
  });
  return fields;
}

function markdownFields(file: string, text: string): TextField[] {
  const fields: TextField[] = [];
  const chunks = text.split(/^```.*$/m);
  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) return;
    const lines = chunk.split(/\r?\n/);
    let offset = 0;
    for (let i = 0; i < index; i += 1) {
      offset += chunks[i]?.split(/\r?\n/).length ?? 0;
    }
    lines.forEach((line, lineIndex) => {
      const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (!heading) return;
      fields.push({
        file,
        field: `heading:${offset + lineIndex + 1}`,
        value: heading[2] ?? "",
        prose: true,
      });
    });
  });
  return fields;
}

function literalFields(file: string, text: string): TextField[] {
  const fields: TextField[] = [];
  let line = 1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\n") {
      line += 1;
      continue;
    }
    if (ch !== "'" && ch !== '"') continue;
    let j = i + 1;
    let closed = false;
    for (; j < text.length; j += 1) {
      const current = text[j];
      if (current === "\\") {
        j += 1;
        continue;
      }
      if (current === "\n") break;
      if (current === ch) {
        closed = true;
        break;
      }
    }
    if (!closed) continue;
    fields.push({
      file,
      field: `literal:${line}`,
      value: text.slice(i + 1, j),
      prose: false,
    });
    i = j;
  }
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
    return literalFields(file, text);
  }
  return keyValueFields(file, text);
}
