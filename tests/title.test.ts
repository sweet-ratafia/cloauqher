import { expect, test } from "bun:test";
import { title } from "../src/title";

test("title normalization", () => expect(title("  hello world ")).toBe("Hello World"));
