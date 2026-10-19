// Input normalizer with ordered rewrite rules.

export type Rule = {
  name: string;
  predicate: (s: string) => boolean;
  rewrite: (s: string) => string;
};

export const RULES: Rule[] = [
  { name: "trim", predicate: (s) => s !== s.trim(), rewrite: (s) => s.trim() },
  { name: "collapse-ws", predicate: (s) => /\s{2,}/.test(s), rewrite: (s) => s.replace(/\s+/g, " ") },
  { name: "lowercase", predicate: (s) => s !== s.toLowerCase(), rewrite: (s) => s.toLowerCase() },
  { name: "no-nul", predicate: (s) => s.includes("\u0000"), rewrite: (s) => s.replace(/\u0000/g, "") },
  { name: "cap-length", predicate: (s) => s.length > 1024, rewrite: (s) => s.slice(0, 1024) },
];

export function normalize(input: string): string {
  let out = input;
  for (const r of RULES) if (r.predicate(out)) out = r.rewrite(out);
  return out;
}

export function listRules(): string[] { return RULES.map((r) => r.name); }
export function describe(): string { return `fi normalizer: ${RULES.length} rules`; }
export const TOTAL_RULES: number = RULES.length;
