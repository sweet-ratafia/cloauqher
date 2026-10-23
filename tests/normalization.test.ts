import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { analyseZipThenRezipTxt, packZip } from "analyse-zip-then-rezip-txt";
import { expect, test } from "bun:test";
import { extractFields } from "../src/fields";
import { analyze, renderMergedReport } from "../src/merged-report";
import { findZipFiles, formatZipTxtWorkspace } from "../src/zip-txt-workspace";

function file(path: string, text: string) {
  return { path, bytes: new TextEncoder().encode(text) };
}

test("formats zip txt entries into a workspace", () => {
  const original = "cafe\u0301 menu #FFF\n";
  const zip = packZip([
    { name: "notes/readme.md", data: "# keep me out\n" },
    { name: "notes/menu.txt", data: original },
    { name: "notes/plain.txt", data: "Already Fine\n" },
    { name: "../secret.txt", data: "hidden\n" },
  ]);

  const analysed = analyseZipThenRezipTxt(zip);
  expect(analysed.entries.map((entry) => entry.name)).toEqual([
    "notes/readme.md",
    "notes/menu.txt",
    "notes/plain.txt",
    "../secret.txt",
  ]);
  const rebuilt = analyseZipThenRezipTxt(analysed.zip);
  expect(rebuilt.entries.map((entry) => [entry.name, entry.text])).toEqual([
    ["notes/menu.txt", original],
    ["notes/plain.txt", "Already Fine\n"],
    ["../secret.txt", "hidden\n"],
  ]);

  const dir = mkdtempSync(join(tmpdir(), "zip-txt-"));
  try {
    const workspaceDir = join(dir, "workspace");
    mkdirSync(join(workspaceDir, "bundle"), { recursive: true });
    writeFileSync(join(workspaceDir, "bundle", "stale.txt"), "old\n");
    const result = formatZipTxtWorkspace({
      workspaceDir,
      archives: [{ name: "bundle.zip", bytes: zip }],
    });

    expect(result.files.map((file) => file.workspaceFile)).toEqual([
      "bundle/notes/menu.txt",
      "bundle/notes/plain.txt",
    ]);
    expect(result.skipped).toEqual([
      {
        archive: "bundle.zip",
        entry: "../secret.txt",
        reason: "unsafe zip path",
      },
    ]);
    expect(readFileSync(result.files[0].outputPath, "utf8")).toBe(
      "Café Menu #ffffff\n",
    );
    expect(result.files[0].changed).toBe(true);
    expect(readFileSync(result.files[1].outputPath, "utf8")).toBe(
      "Already Fine\n",
    );
    expect(result.files[1].changed).toBe(false);
    expect(existsSync(join(workspaceDir, "bundle", "stale.txt"))).toBe(false);
    expect(readFileSync(join(workspaceDir, "zip-txt.md"), "utf8")).toContain(
      "unsafe zip path",
    );
    expect(analyze([file("notes/menu.txt", original)]).fields).toEqual([
      {
        file: "notes/menu.txt",
        field: "line:1",
        before: "cafe\u0301 menu #FFF",
        after: "Café Menu #ffffff",
      },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("does not wipe a workspace directory when no txt entry is written", () => {
  const dir = mkdtempSync(join(tmpdir(), "zip-keep-"));
  try {
    const workspaceDir = join(dir, "workspace");
    mkdirSync(join(workspaceDir, "bundle"), { recursive: true });
    writeFileSync(join(workspaceDir, "bundle", "keep.txt"), "stay\n");
    formatZipTxtWorkspace({
      workspaceDir,
      archives: [
        {
          name: "bundle.zip",
          bytes: packZip([{ name: "../secret.txt", data: "hidden\n" }]),
        },
      ],
    });
    expect(readFileSync(join(workspaceDir, "bundle", "keep.txt"), "utf8")).toBe(
      "stay\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finds zip files outside skipped directories", () => {
  const dir = mkdtempSync(join(tmpdir(), "zip-find-"));
  const zip = packZip([{ name: "a.txt", data: "Hi\n" }]);
  try {
    mkdirSync(join(dir, "node_modules"));
    mkdirSync(join(dir, "workspace"));
    writeFileSync(join(dir, "notes.zip"), zip);
    writeFileSync(join(dir, "node_modules", "skip.zip"), zip);
    writeFileSync(join(dir, "workspace", "out.zip"), zip);
    expect(findZipFiles(dir).map((found) => relative(dir, found))).toEqual([
      "notes.zip",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("detects text-like files and skips binary", () => {
  const report = analyze([
    file("notes/readme.md", "# hello\n"),
    file("data.json", '{"title":"cafe\u0301"}\n'),
    file("src/app.ts", "export const label = 'ok';\n"),
    file("photo.bin", "a\u0000b"),
    file("node_modules/pkg/index.js", "export const x = 1;\n"),
  ]);
  expect(report.files.map((item) => item.path)).toEqual([
    "data.json",
    "notes/readme.md",
    "src/app.ts",
  ]);
});

test("normalizes unicode fields, titles, and colors", () => {
  const report = analyze([
    file(
      "catalog.json",
      JSON.stringify({
        description: "cafe\u0301 menu",
        color: "#FFF",
        script: "ﬁle",
      }),
    ),
    file("docs/guide.md", "# well-known path\n\nSee #F00.\n"),
    file("src/theme.ts", "const ink = '#abc';\nconst issue = '#123';\n"),
  ]);

  expect(report.fields).toEqual(
    expect.arrayContaining([
      {
        file: "catalog.json",
        field: "description",
        before: "cafe\u0301 menu",
        after: "Café Menu",
      },
      {
        file: "catalog.json",
        field: "color",
        before: "#FFF",
        after: "#ffffff",
      },
      {
        file: "catalog.json",
        field: "script",
        before: "ﬁle",
        after: "file",
      },
      {
        file: "docs/guide.md",
        field: "heading:1",
        before: "well-known path",
        after: "Well-Known Path",
      },
    ]),
  );
  expect(report.colors).toEqual(
    expect.arrayContaining([
      { file: "docs/guide.md", before: "#F00", after: "#ff0000" },
      { file: "src/theme.ts", before: "#abc", after: "#aabbcc" },
    ]),
  );
  expect(report.colors.some((color) => color.before === "#123")).toBe(false);
});

test("handles contractions, exact field names, comments, and markdown fences", () => {
  const report = analyze([
    file("notes.txt", "it's don't\n"),
    file(
      "settings.yml",
      'name: "hello #world"\nlabel: release notes # keep this comment\n',
    ),
    file("docs.md", "# Before\n```ts\n# not a heading\n```\n## After\n"),
    file(
      "config.json",
      JSON.stringify({ color_mode: "dark", authorlabel: "API value" }),
    ),
  ]);

  expect(report.fields).toEqual(
    expect.arrayContaining([
      {
        file: "notes.txt",
        field: "line:1",
        before: "it's don't",
        after: "It's Don't",
      },
      {
        file: "settings.yml",
        field: "label:2",
        before: "release notes",
        after: "Release Notes",
      },
    ]),
  );
  expect(report.syntax).toEqual([]);
  expect(
    extractFields(
      "docs.md",
      "# Before\n```ts\n# not a heading\n```\n## After\n",
    ),
  ).toEqual([
    {
      file: "docs.md",
      field: "heading:1",
      value: "Before",
      prose: true,
    },
    {
      file: "docs.md",
      field: "heading:5",
      value: "After",
      prose: true,
    },
  ]);
  expect(extractFields("docs.md", "## Title ##\n")).toEqual([
    {
      file: "docs.md",
      field: "heading:1",
      value: "Title",
      prose: true,
    },
  ]);
  expect(
    analyze([file("notes.json", JSON.stringify({ note: "a\u0001b" }))]).fields,
  ).toEqual([
    {
      file: "notes.json",
      field: "note",
      before: "a\u0001b",
      after: "ab",
    },
  ]);
  expect(
    extractFields(
      "config.json",
      JSON.stringify({ color_mode: "dark", authorlabel: "API value" }),
    ),
  ).toEqual([
    {
      file: "config.json",
      field: "color_mode",
      value: "dark",
      prose: false,
    },
    {
      file: "config.json",
      field: "authorlabel",
      value: "API value",
      prose: false,
    },
  ]);
});

test("checks json, markdown, and yaml syntax", () => {
  const report = analyze([
    file("broken.json", "{"),
    file("doc.md", "```ts\nlet x = 1;\n"),
    file("config.yml", '\tname: "unterminated\n'),
  ]);
  expect(
    report.syntax.map((issue) => `${issue.file}: ${issue.message}`),
  ).toEqual([
    expect.stringContaining("broken.json: invalid JSON"),
    "config.yml: line 1: tab indentation",
    "config.yml: line 1: unbalanced double quote",
    "doc.md: unclosed markdown code fence",
  ]);
});

test("does not treat comments and regex literals as code fields", () => {
  const report = analyze([
    file(
      "src/example.ts",
      "// 'comment'\nconst pattern = /don't/;\nconst color = '#FFF';\n",
    ),
  ]);

  expect(report.fields).toEqual([]);
  expect(report.colors).toEqual([
    { file: "src/example.ts", before: "#FFF", after: "#ffffff" },
  ]);
});

test("reports invalid values in color fields", () => {
  const report = analyze([
    file("theme.json", JSON.stringify({ color: "not-a-color" })),
  ]);

  expect(report.syntax).toEqual([
    { file: "theme.json", message: "invalid color value for color" },
  ]);
});

test("caps JSON field traversal depth", () => {
  let nested: unknown = "deep value";
  for (let depth = 0; depth < 70; depth += 1) nested = { child: nested };

  expect(extractFields("deep.json", JSON.stringify(nested))).toEqual([]);
});

test("renders one report that merges every section", () => {
  const rendered = renderMergedReport(
    analyze([file("title.txt", "cafe\u0301 #FFF\n")]),
  );
  expect(rendered).toContain("## Text-like files");
  expect(rendered).toContain("## Field normalization");
  expect(rendered).toContain("## Colors");
  expect(rendered).toContain("## Syntax");
  expect(rendered).toContain("title.txt");
  expect(rendered).toContain("#ffffff");
  expect(rendered).toContain("Café #ffffff");
});
