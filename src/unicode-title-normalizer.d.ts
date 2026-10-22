export type NormalizeTitleOptions = {
  form?: "NFC" | "NFD" | "NFKC" | "NFKD";
  titleCase?: boolean;
  colors?: boolean;
};

export function normalizeTitle(
  input: string,
  options?: NormalizeTitleOptions,
): string;

export function normalizeColor(input: string): string;
