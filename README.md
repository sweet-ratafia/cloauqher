# Unicode field normalization

This project scans text files and proposes Unicode, title, and color
normalization. It does not rewrite those source files. `.txt` members inside
`.zip` archives are the exception: `bun run format:zip-txt` writes formatted
copies under `workspace/`.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run lint
bun run format:check
bun run normalize:report
bun run format:zip-txt
```

`bun run format:zip-txt` is the command that uses `analyse-zip-then-rezip-txt`.
It finds `.zip` files, reads their `.txt` entries through that package, and
writes normalized copies to `workspace/`. An optional path selects the scan
root:

```bash
bun run format:zip-txt -- /path/to/source
```

`bun run normalize:report` does that same write, then renders
`reports/normalization-report.md`. Zip text is included there as `zip-txt/...`.
`bun test` also imports the package from `tests/normalization.test.ts`.

## Lint

`bun run lint` runs ESLint. It is a separate command from `bun test`. Tests
check behavior. ESLint checks the source before those tests run.

Prettier only formats. `bun run typecheck` covers the TypeScript files, and it
does not include `src/unicode-title-normalizer.js`. ESLint covers that plain
JavaScript file plus unused bindings and other mistakes in `src/`, `tests/`,
and `scripts/`. Generated output under `workspace/` and `reports/` is ignored.

ESLint is a normal dev dependency. It is not listed in `trustedDependencies`,
so `bun install` does not run an ESLint lifecycle script. The linter runs only
when you invoke `bun run lint`.

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

`analyse-zip-then-rezip-txt` is the module that will be published on npm. Until
then it is linked with `file:../analyse-zip-then-rezip-txt`. Code imports it by
that package name.

`fixtures/sample-notes.zip` is the checked-in sample. The formatter writes:

- `workspace/fixtures__sample-notes/notes/menu.txt`
- `workspace/fixtures__sample-notes/notes/plain.txt`
- `workspace/zip-txt.md`

`café menu #FFF` becomes `Café Menu #ffffff`. `../secret.txt` is reported in
`workspace/zip-txt.md` and is not written. Non-`.txt` members, such as
`notes/readme.md`, are ignored. The next run replaces that archive's directory,
so entries removed from the zip do not linger.

## Layout

| Path | Role |
| --- | --- |
| `src/merged-report.ts` | Runs detection, normalization, colors, and syntax, then renders the report |
| `src/fields.ts` | Extracts fields and normalizes them |
| `src/colors.ts` | Canonicalizes color tokens |
| `src/text-files.ts` | Decides which files are text and which paths are skipped |
| `src/syntax-check.ts` | Checks JSON, Markdown, YAML, and TOML |
| `src/zip-txt-workspace.ts` | Finds zips and writes `workspace/` |
| `src/unicode-title-normalizer.js` | Unicode, title case, and color implementation |
| `scripts/format-zip-txt.ts` | CLI for `bun run format:zip-txt` |
| `scripts/write-normalization-report.ts` | CLI for `bun run normalize:report` |
| `fixtures/sample-notes.zip` | Sample archive, including an unsafe path |
| `workspace/` | Generated `.txt` copies and `zip-txt.md` |
| `reports/normalization-report.md` | Generated combined report |
