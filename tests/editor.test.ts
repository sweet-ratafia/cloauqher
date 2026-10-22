import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packZip } from "analyse-zip-then-rezip-txt";
import { expect, test } from "bun:test";
import {
  EDITOR_VERSION,
  listTxt,
  markdownPreview,
  normalizeText,
  openDocument,
  previewDocument,
  readSettings,
  readZipTxt,
  stats,
  titleCard,
  useEditor,
} from "../src/txt-editor";

test("reads editor settings and rejects a newer editor", () => {
  expect(readSettings("")).toEqual({ editor: EDITOR_VERSION, wrap: 80 });
  expect(readSettings("wrap: 60\n")).toMatchObject({ wrap: 60 });
  expect(() => readSettings("editor: 9.0.0\n")).toThrow(/9\.0\.0/);
});

test("opens a note and counts words", () => {
  const doc = openDocument("note.txt", "one two\nthree\n");
  expect(doc.id).toHaveLength(10);
  expect(doc.path).toBe("note.txt");
  expect(stats(doc.text, 80)).toMatchObject({
    lines: 3,
    words: 3,
    chars: 15,
    overWrap: false,
  });
  useEditor.getState().replace("replaced\n");
  expect(useEditor.getState().doc?.text).toBe("replaced\n");
});

test("normalizes text and renders a preview page", () => {
  expect(normalizeText("cafe\u0301 menu #FFF\n")).toBe("Café Menu #ffffff\n");
  expect(markdownPreview("# Hello")).toContain("<h1>");
  const page = previewDocument("Hello", "# Hello\n");
  expect(page).toContain("<article>");
  expect(page).toContain("Hello");
});

test("lists txt files and reads a safe zip entry", async () => {
  const dir = mkdtempSync(join(tmpdir(), "txt-editor-"));
  try {
    writeFileSync(join(dir, "a.txt"), "A\n");
    writeFileSync(join(dir, "skip.md"), "# no\n");
    expect(await listTxt(dir)).toEqual(["a.txt"]);

    const zip = packZip([
      { name: "notes/menu.txt", data: "soup\n" },
      { name: "../secret.txt", data: "hidden\n" },
    ]);
    expect(readZipTxt(zip, "notes/menu.txt")).toBe("soup\n");
    expect(() => readZipTxt(zip, "../secret.txt")).toThrow(/unsafe zip path/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("draws a png title card", async () => {
  const png = await titleCard("Café Menu");
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
});
