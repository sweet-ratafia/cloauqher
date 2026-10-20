# Reviewer install-safety harness

This repository lets Claude install the root development dependencies with the
ordinary `bun install` command. Root `bunfig.toml` disables lifecycle scripts,
and the reviewer policy verifies that this protection and the workflow
permission remain in place.

Run `bun install`, `bun run security:check`, `bun run format:check`,
`bun run typecheck`, and `bun test`.

## Security check

`bun run security:check` runs `scripts/check-reviewer-safety.ts`. It reads the
root `package.json` and checks that every direct dependency is the latest
version published for that name.

It covers `dependencies`, `devDependencies`, and `optionalDependencies`. For
each entry it fetches the `latest` dist-tag from `https://registry.npmjs.org`,
or from `NPM_CONFIG_REGISTRY` when that variable is set. An exact pin must
equal `latest`. A range passes when `latest` satisfies it. An `npm:` alias is
checked against the aliased package. `workspace:`, `file:`, `link:`, git, and
URL specs are skipped, because they are not registry versions. The command
prints one line per dependency and exits with status 1 when anything is
outdated or a registry lookup fails. It does not read the lockfile or
transitive dependencies.

Every dependency is declared in that root manifest. There is no nested
`package.json`.

<!-- normalization-report -->

# Merged normalization report

This report merges text-file detection, Unicode field normalization, color canonicalization, and text syntax checking.
Source files are not rewritten. Rows are proposals.

## Summary

- Text-like files: 35
- Fields that would change: 11
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
| src/colors.ts                                                         | code     |
| src/fields.ts                                                         | code     |
| src/merged-report.ts                                                  | code     |
| src/syntax-check.ts                                                   | code     |
| src/text-files.ts                                                     | code     |
| src/unicode-title-normalizer.d.ts                                     | code     |
| src/unicode-title-normalizer.js                                       | code     |
| tests/normalization.test.ts                                           | code     |
| tests/reviewer-policy.test.ts                                         | code     |
| tsconfig.json                                                         | json     |

## Field normalization

String fields are Unicode-normalized (NFKC). Format characters are removed.
Headings, `.txt` lines, and fields named title, description, summary, heading, or label are title-cased.
Color-like fields and inline `#hex`, `rgb()`, and `hsl()` values are canonicalized to `#rrggbb`.
A short all-digit token such as `#123` is left alone so issue references stay issue references.

| File                        | Field      | Before                                       | After                                           |
| --------------------------- | ---------- | -------------------------------------------- | ----------------------------------------------- |
| CLAUDE.md                   | heading:1  | CLAUDE.md                                    | Claude.md                                       |
| CLAUDE.md                   | heading:48 | Security hardening for GitHub Actions        | Security Hardening For Github Actions           |
| tests/normalization.test.ts | literal:29 | #FFF                                         | #ffffff                                         |
| tests/normalization.test.ts | literal:30 | ﬁle                                          | file                                            |
| tests/normalization.test.ts | literal:33 | # well-known path\n\nSee #F00.\n             | # well-known path\n\nSee #ff0000.\n             |
| tests/normalization.test.ts | literal:34 | const ink = '#abc';\nconst issue = '#123';\n | const ink = '#aabbcc';\nconst issue = '#123';\n |
| tests/normalization.test.ts | literal:48 | #FFF                                         | #ffffff                                         |
| tests/normalization.test.ts | literal:54 | ﬁle                                          | file                                            |
| tests/normalization.test.ts | literal:67 | #F00                                         | #ff0000                                         |
| tests/normalization.test.ts | literal:68 | #abc                                         | #aabbcc                                         |
| tests/normalization.test.ts | literal:92 | cafe\u0301 #FFF\n                            | cafe\u0301 #ffffff\n                            |

## Colors

| File                        | Value | Canonical |
| --------------------------- | ----- | --------- |
| tests/normalization.test.ts | #FFF  | #ffffff   |
| tests/normalization.test.ts | #F00  | #ff0000   |
| tests/normalization.test.ts | #abc  | #aabbcc   |

## Syntax

No syntax issues.
