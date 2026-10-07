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
| .claude/agents/code-quality-reviewer.md                               | markdown |
| .claude/agents/documentation-accuracy-reviewer.md                     | markdown |
| .claude/agents/performance-reviewer.md                                | markdown |
| .claude/agents/security-code-reviewer.md                              | markdown |
| .claude/agents/test-coverage-reviewer.md                              | markdown |
| .claude/commands/commit-and-pr.md                                     | markdown |
| .claude/commands/label-issue.md                                       | markdown |
| .claude/commands/review-pr.md                                         | markdown |
| .claude/settings.json                                                 | json     |
| .claude/workflows/pr-stamp-sweep.js                                   | code     |
| .github/workflows/iyeicuqw.yml                                        | yaml     |
| .gitignore                                                            | text     |
| .prettierignore                                                       | text     |
| bunfig.toml                                                           | toml     |
| CLAUDE.md                                                             | markdown |
| package.json                                                          | json     |
| scripts/check-reviewer-safety.ts                                      | code     |
| scripts/write-normalization-report.ts                                 | code     |
| security-fixtures/trusted-dependency-review/bunfig.toml               | toml     |
| security-fixtures/trusted-dependency-review/checks/catalog.fixture.ts | code     |
| security-fixtures/trusted-dependency-review/PR_DESCRIPTION.md         | markdown |
| security-fixtures/trusted-dependency-review/src/catalog.ts            | code     |
| security-fixtures/trusted-dependency-review/tsconfig.json             | json     |
| src/ath-gziphugefile-stage.ts                                         | code     |
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

| File      | Field      | Before                                | After                                 |
| --------- | ---------- | ------------------------------------- | ------------------------------------- |
| CLAUDE.md | heading:1  | CLAUDE.md                             | Claude.md                             |
| CLAUDE.md | heading:48 | Security hardening for GitHub Actions | Security Hardening For Github Actions |

## Colors

| File                        | Value | Canonical |
| --------------------------- | ----- | --------- |
| tests/normalization.test.ts | #FFF  | #ffffff   |
| tests/normalization.test.ts | #F00  | #ff0000   |
| tests/normalization.test.ts | #abc  | #aabbcc   |

## Syntax

No syntax issues.
