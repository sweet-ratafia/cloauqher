import { normalizeColor } from "./unicode-title-normalizer.js";

const INLINE_COLOR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;

const COLOR_KEY = /(color|colour|background|foreground|fill|stroke)/i;

export function isColorToken(token: string): boolean {
  if (token.startsWith("#")) {
    const body = token.slice(1);
    if (![3, 4, 6, 8].includes(body.length)) return false;
    if (!/^[0-9a-fA-F]+$/.test(body)) return false;
    if (/[a-fA-F]/.test(body)) return true;
    return body.length >= 6;
  }
  return /^(?:rgba?|hsla?)\(/i.test(token);
}

export function canonicalColor(token: string): string | null {
  try {
    return normalizeColor(token.trim());
  } catch {
    return null;
  }
}

export function canonicalizeColors(input: string): string {
  return input.replace(INLINE_COLOR, (token) => {
    if (!isColorToken(token)) return token;
    try {
      return normalizeColor(token);
    } catch {
      return token;
    }
  });
}

export function findColors(
  text: string,
): Array<{ before: string; after: string }> {
  const found: Array<{ before: string; after: string }> = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(INLINE_COLOR)) {
    const before = match[0];
    if (!isColorToken(before) || seen.has(before)) continue;
    let after: string;
    try {
      after = normalizeColor(before);
    } catch {
      continue;
    }
    seen.add(before);
    if (after !== before) found.push({ before, after });
  }
  return found;
}

export function isColorField(field: string): boolean {
  return COLOR_KEY.test(field);
}
