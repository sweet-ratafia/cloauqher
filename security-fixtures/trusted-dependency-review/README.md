# Trusted-dependency refusal fixture

This standalone project models a dependency-heavy PR containing an optional
package that returned npm HTTP 404 during the 2026-10-19 research run. The
manifest deliberately places that package beside well-known lifecycle packages
in `trustedDependencies`.

The fixture is defensive test data. It is not a root workspace and its expected
review decision is recorded in `expected-decision.json`. If dependencies are
needed for local validation, use `bun install --ignore-scripts`; never enable
lifecycle scripts for this fixture.
