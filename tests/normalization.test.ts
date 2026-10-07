import { expect, test } from "bun:test";
import { readAthGzipHugeFileStageManifest } from "../src/ath-gziphugefile-stage";
import { extractFields } from "../src/fields";
import { analyze, renderMergedReport } from "../src/merged-report";

function file(path: string, text: string) {
  return { path, bytes: new TextEncoder().encode(text) };
}

test("installs the pinned ath-gziphugefile staging artifact", () => {
  const manifest = readAthGzipHugeFileStageManifest();

  expect(manifest).toMatchObject({
    name: "ath-gziphugefile",
    version: "0.0.0-stage",
    stub: true,
  });
  expect(manifest.scripts).toBeUndefined();
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
