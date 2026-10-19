import { expect, test } from "bun:test";
import { makeBuild, describeBuild, DEFAULT_BUILD } from "../bu";

test("makeBuild returns the given version", () => {
  expect(makeBuild(7).version).toBe(7);
});

test("describeBuild contains the version", () => {
  expect(describeBuild(DEFAULT_BUILD)).toContain("build@1");
});
