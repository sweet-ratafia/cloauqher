import { expect, test } from "bun:test";
import { normalize, RULES, TOTAL_RULES, listRules } from "../fi";

test("normalize trims", () => { expect(normalize("  hi  ")).toBe("hi"); });
test("normalize collapses whitespace", () => { expect(normalize("a   b")).toBe("a b"); });
test("normalize lowercases", () => { expect(normalize("ABC")).toBe("abc"); });
test("normalize removes nul", () => { expect(normalize("a\u0000b")).toBe("ab"); });
test("TOTAL_RULES matches", () => { expect(TOTAL_RULES).toBe(RULES.length); });
test("listRules returns names", () => { expect(listRules()).toContain("trim"); });
