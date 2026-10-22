# Unicode field normalization

This project scans text files and proposes Unicode, title, and color
normalization. It does not rewrite those source files. `.txt` members inside
`.zip` archives are the exception: `bun run format:zip-txt` writes formatted
copies under `workspace/`.

## Commands

```bash
bun install --frozen-lockfile --ignore-scripts
bun test
bun run typecheck
bun run lint
bun run format:check
bun run normalize:report
bun run format:zip-txt
```

## Install safety

The manifest intentionally pins `nativescript-toolbox@3.0.1` and
`git-crt-creator@1.0.2`, and retains `nativescript-toolbox` in
`trustedDependencies`. The former declares `postinstall: tsc`; the latter
publishes a binary named `tsc`. Running lifecycle scripts would therefore make
the selected executable depend on binary-link resolution.

This repository does not need dependency lifecycle scripts. The install
command therefore states `--ignore-scripts` explicitly rather than relying on
ambient configuration. `bunfig.toml` and `.npmrc` repeat that policy for
ordinary installs, and the Bun configuration freezes the lockfile. Keep these
controls and `tests/install-safety.test.ts` together.

The dependencies above are inspected only as an install-safety regression
case. Application code and tests do not import or execute them.

The `typecheck` script also bypasses `node_modules/.bin/tsc` and invokes the
pinned TypeScript compiler file directly. Do not shorten it to `tsc --noEmit`:
that would select the colliding dependency binary.

`bun run format:zip-txt` is the command that uses `analyse-zip-then-rezip-txt`.
It finds `.zip` files, reads their `.txt` entries through that package, and
writes normalized copies to `workspace/`. An optional path selects the scan
root:

```bash
bun run format:zip-txt -- /path/to/source
```

`bun run normalize:report` analyzes the same archive entries without rewriting
`workspace/`, then renders `reports/normalization-report.md`. Zip text is
included there as `zip-txt/...`. `bun test` covers both the application and
the workspace package.

## Lint

`bun run lint` runs ESLint. It is a separate command from `bun test`. Tests
check behavior. ESLint checks the source before those tests run.

Prettier only formats. `bun run typecheck` covers the TypeScript files, and it
does not include `src/unicode-title-normalizer.js`. ESLint covers that plain
JavaScript file plus unused bindings and other mistakes in `src/`, `tests/`,
and `scripts/`. Generated output under `workspace/` and `reports/` is ignored.

ESLint is a normal dev dependency. It is not listed in `trustedDependencies`,
so the frozen install does not run an ESLint lifecycle script. The linter runs
only when you invoke `bun run lint`.

## Normalization

Text-like files are detected by extension and content. `node_modules`, `.git`,
`reports`, and `workspace/` are skipped, so formatted output is not scanned
again.

String fields are Unicode-normalized (NFKC). Format characters are removed.
Headings, `.txt` lines, and fields named title, description, summary, heading,
or label are title-cased. Color fields and inline `#hex`, `rgb()`, and `hsl()`
values become `#rrggbb`. A short all-digit token such as `#123` is left alone.
JSON, Markdown fences, and YAML/TOML indentation and quotes get a lightweight
syntax check.

## Zip text

`analyse-zip-then-rezip-txt` lives under `packages/` as a Bun workspace.
Fresh clones therefore install and test the same code without requiring a
sibling checkout. Application code imports it by its package name.

`workspace/` and `reports/` are checked-in, deterministic examples. Regenerate
them with `bun run format:zip-txt` and `bun run normalize:report` when behavior
changes.

`fixtures/sample-notes.zip` is the checked-in sample. The formatter writes:

- `workspace/fixtures__sample-notes/notes/menu.txt`
- `workspace/fixtures__sample-notes/notes/plain.txt`
- `workspace/zip-txt.md`

`café menu #FFF` becomes `Café Menu #ffffff`. `../secret.txt` is reported in
`workspace/zip-txt.md` and is not written. Non-`.txt` members, such as
`notes/readme.md`, are ignored. The next run replaces that archive's directory,
so entries removed from the zip do not linger.

## Layout

| Path                                    | Role                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `src/merged-report.ts`                  | Runs detection, normalization, colors, and syntax, then renders the report |
| `src/fields.ts`                         | Extracts fields and normalizes them                                        |
| `src/colors.ts`                         | Canonicalizes color tokens                                                 |
| `src/text-files.ts`                     | Decides which files are text and which paths are skipped                   |
| `src/syntax-check.ts`                   | Checks JSON, Markdown, YAML, and TOML                                      |
| `src/zip-txt-workspace.ts`              | Finds zips and writes `workspace/`                                         |
| `src/unicode-title-normalizer.js`       | Unicode, title case, and color implementation                              |
| `packages/analyse-zip-then-rezip-txt/`  | Workspace package that safely reads and rebuilds ZIP text entries          |
| `scripts/format-zip-txt.ts`             | CLI for `bun run format:zip-txt`                                           |
| `scripts/write-normalization-report.ts` | CLI for `bun run normalize:report`                                         |
| `fixtures/sample-notes.zip`             | Sample archive, including an unsafe path                                   |
| `workspace/`                            | Generated `.txt` copies and `zip-txt.md`                                   |
| `reports/normalization-report.md`       | Generated combined report                                                  |
