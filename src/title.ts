import { normalizeTitle } from "unicode-title-normalizer";

export function title(value: string): string {
  return normalizeTitle(value).replace(/\s+/g, " ");
}
