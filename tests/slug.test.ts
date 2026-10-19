import { expect, test } from "bun:test";
import { slug } from "../src/slug";

test("slug", () => expect(slug("Hello World")).toBe("hello-world"));
