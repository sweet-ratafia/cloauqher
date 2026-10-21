import { expect, mock, test } from "bun:test";
import { normalizeField } from "../src/fields";

mock.module("utils/types", () => ({
  isNullOrUndefined(value: unknown) {
    return value === null || value === undefined;
  },
}));

const { format } = await import("nativescript-toolbox/stringformat");

test("formats a normalized text line with nativescript-toolbox format", () => {
  const line = normalizeField({
    file: "notes/menu.txt",
    field: "line:1",
    value: "cafe\u0301 menu",
    prose: true,
  });

  expect(format("Title: {0}", line)).toBe("Title: Café Menu");
});
