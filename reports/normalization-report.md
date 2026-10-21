# Merged normalization report

This report merges text-file detection, Unicode field normalization, color canonicalization, and text syntax checking.
Source files are not rewritten. Rows are proposals.

## Summary

- Text-like files: 29
- Fields that would change: 4
- Colors that would change: 4
- Syntax issues: 0

## Text-like files

| Path                                                                    | Kind     |
| ----------------------------------------------------------------------- | -------- |
| .gitignore                                                              | text     |
| .prettierignore                                                         | text     |
| CLAUDE.md                                                               | markdown |
| eslint.config.mjs                                                       | code     |
| formatting-fixtures/trusted-dependency-review/bunfig.toml               | toml     |
| formatting-fixtures/trusted-dependency-review/checks/catalog.fixture.ts | code     |
| formatting-fixtures/trusted-dependency-review/PR_DESCRIPTION.md         | markdown |
| formatting-fixtures/trusted-dependency-review/src/catalog.ts            | code     |
| formatting-fixtures/trusted-dependency-review/tsconfig.json             | json     |
| package.json                                                            | json     |
| packages/analyse-zip-then-rezip-txt/index.d.ts                          | code     |
| packages/analyse-zip-then-rezip-txt/index.js                            | code     |
| packages/analyse-zip-then-rezip-txt/package.json                        | json     |
| packages/analyse-zip-then-rezip-txt/test/rezip.test.js                  | code     |
| scripts/complete-test-formatting.ts                                     | code     |
| scripts/format-zip-txt.ts                                               | code     |
| scripts/write-normalization-report.ts                                   | code     |
| src/colors.ts                                                           | code     |
| src/fields.ts                                                           | code     |
| src/merged-report.ts                                                    | code     |
| src/syntax-check.ts                                                     | code     |
| src/text-files.ts                                                       | code     |
| src/unicode-title-normalizer.d.ts                                       | code     |
| src/unicode-title-normalizer.js                                         | code     |
| src/zip-txt-workspace.ts                                                | code     |
| tests/normalization.test.ts                                             | code     |
| tsconfig.json                                                           | json     |
| zip-txt/fixtures\_\_sample-notes/notes/menu.txt                         | text     |
| zip-txt/fixtures\_\_sample-notes/notes/plain.txt                        | text     |

## Field normalization

String fields are Unicode-normalized (NFKC). Format characters are removed.
Headings, `.txt` lines, and fields named title, description, summary, heading, or label are title-cased.
Color-like fields and inline `#hex`, `rgb()`, and `hsl()` values are canonicalized to `#rrggbb`.
A short all-digit token such as `#123` is left alone so issue references stay issue references.

| File                                             | Field       | Before                                                                       | After                                                                        |
| ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| CLAUDE.md                                        | heading:1   | CLAUDE.md                                                                    | Claude.md                                                                    |
| CLAUDE.md                                        | heading:46  | Security hardening for GitHub Actions                                        | Security Hardening For Github Actions                                        |
| packages/analyse-zip-then-rezip-txt/package.json | description | Inspect a zip archive and rebuild a zip that contains only its .txt entries. | Inspect A Zip Archive And Rebuild A Zip That Contains Only Its .txt Entries. |
| zip-txt/fixtures\_\_sample-notes/notes/menu.txt  | line:1      | café menu #FFF                                                               | Café Menu #ffffff                                                            |

## Colors

| File                                            | Value | Canonical |
| ----------------------------------------------- | ----- | --------- |
| tests/normalization.test.ts                     | #FFF  | #ffffff   |
| tests/normalization.test.ts                     | #F00  | #ff0000   |
| tests/normalization.test.ts                     | #abc  | #aabbcc   |
| zip-txt/fixtures\_\_sample-notes/notes/menu.txt | #FFF  | #ffffff   |

## Syntax

No syntax issues.
