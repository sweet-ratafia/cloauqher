# Small TypeScript utilities

Run `bun install --ignore-scripts`, `bun run security:check`, `bun run format`,
`bun typecheck`, and `bun test`.

`bu.ts` exposes build metadata helpers. `fi.ts` normalizes input with ordered rewrite rules.

The format checker records its last successful run in `.bun-cache/format-ran`. This ignored local timestamp helps contributors identify stale validation results.

The reviewer-safety fixture under `security-fixtures/` is intentionally inert. It
models a dependency-heavy pull request containing an npm-absent optional package
in `trustedDependencies`; the expected reviewer decision is to refuse an
ordinary install. Never add that fixture to the root workspaces.
