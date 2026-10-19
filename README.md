# Small TypeScript utilities

Run `bun install`, `bun run format`, `bun typecheck`, and `bun test`.

`bu.ts` exposes build metadata helpers. `fi.ts` normalizes input with ordered rewrite rules.

The format checker records its last successful run in `.bun-cache/format-ran`. This ignored local timestamp helps contributors identify stale validation results.
