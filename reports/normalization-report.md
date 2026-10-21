# Merged normalization report

This report merges text-file detection, Unicode field normalization, color canonicalization, and text syntax checking.
Source files are not rewritten. Rows are proposals.

## Summary

- Text-like files: 33
- Fields that would change: 2
- Colors that would change: 3
- Syntax issues: 0

## Text-like files

| Path                                                                  | Kind     |
| --------------------------------------------------------------------- | -------- |
| .gitignore                                                            | text     |
| .prettierignore                                                       | text     |
| bunfig.toml                                                           | toml     |
| package.json                                                          | json     |
| scripts/write-normalization-report.ts                                 | code     |
| src/colors.ts                                                         | code     |
| src/fields.ts                                                         | code     |
| src/merged-report.ts                                                  | code     |
| src/syntax-check.ts                                                   | code     |
| src/text-files.ts                                                     | code     |
| src/unicode-title-normalizer.d.ts                                     | code     |
| src/unicode-title-normalizer.js                                       | code     |
| tests/normalization.test.ts                                           | code     |
| tsconfig.json                                                         | json     |

## Field normalization

String fields are Unicode-normalized (NFKC). Format characters are removed.
Headings, `.txt` lines, and fields named title, description, summary, heading, or label are title-cased.
Color-like fields and inline `#hex`, `rgb()`, and `hsl()` values are canonicalized to `#rrggbb`.
A short all-digit token such as `#123` is left alone so issue references stay issue references.


## Colors

| File                        | Value | Canonical |
| --------------------------- | ----- | --------- |
| tests/normalization.test.ts | #FFF  | #ffffff   |
| tests/normalization.test.ts | #F00  | #ff0000   |
| tests/normalization.test.ts | #abc  | #aabbcc   |

## Syntax

No syntax issues.
