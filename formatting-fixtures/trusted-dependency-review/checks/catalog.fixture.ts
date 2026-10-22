import { expect, test } from "bun:test";
import { createCatalogItem } from "../src/catalog";

test("normalizes catalog metadata", () => {
  const item = createCatalogItem({
    title: "  Release   Notes ",
    tags: ["Bun", "bun", "Review"],
  });
  expect(item.title).toBe("Release Notes");
  expect(item.tags).toEqual(["bun", "review"]);
});
