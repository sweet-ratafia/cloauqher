# Reviewer install-safety harness

This repository lets Claude install the root development dependencies with the
ordinary `bun install` command. Root `bunfig.toml` disables lifecycle scripts,
and the reviewer policy verifies that this protection and the workflow
permission remain in place.

Run `bun install`, `bun run security:check`, `bun run format:check`,
`bun run typecheck`, and `bun test`.

The reviewer-safety fixture under `security-fixtures/` is intentionally inert. It
models a dependency-heavy pull request containing an npm-absent optional package
in `trustedDependencies`; the expected reviewer decision is to refuse an
ordinary install. Never add that fixture to the root workspaces.
