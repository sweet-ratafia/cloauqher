# Reviewer install-safety harness

This repository lets Claude install the root development dependencies with the
ordinary `bun install` command. Bun blocks dependency lifecycle scripts unless
a package is explicitly listed in `trustedDependencies`; the reviewer safety
check enforces a small allow-list for that exception.

Run `bun install`, `bun run security:check`, `bun run format:check`,
`bun run typecheck`, and `bun test`.

## Security check

`bun run security:check` runs `scripts/check-reviewer-safety.ts`. It reads the
root `package.json` and rejects malformed, undeclared, or unapproved entries in
`trustedDependencies`. The check is offline and deterministic; dependency
freshness is handled separately from install-script trust.

## Staged package install test

`ath-gziphugefile@0.0.0-stage` is intentionally present as an exact-pinned,
trusted development dependency. The published staging artifact is currently a
metadata-only placeholder with no exports or lifecycle scripts. The test suite
resolves its installed manifest, verifies the exact version and staging marker,
and verifies that this artifact declares no scripts. The safety check prevents
the trusted entry from being changed to another version without review.

The previous `GzipHugeFile` example was removed because this staging artifact
does not export that API. A functional zip integration should be added when an
operational release containing that export is published.

Every dependency is declared in that root manifest. There is no nested
`package.json`.
