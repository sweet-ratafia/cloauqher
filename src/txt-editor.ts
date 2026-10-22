import { analyseZip, safeRelativeTxtPath } from "analyse-zip-then-rezip-txt";
import axios from "axios";
import { formatISO } from "date-fns";
import fg from "fast-glob";
import { truncate, words } from "lodash-es";
import { marked } from "marked";
import { nanoid } from "nanoid";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import semver from "semver";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { formatTxtContent } from "./zip-txt-workspace";

export const EDITOR_VERSION = "0.2.0";

const Settings = z.object({
  editor: z.string().default(EDITOR_VERSION),
  wrap: z.number().int().min(20).max(200).default(80),
});

export type EditorSettings = z.infer<typeof Settings>;

export type Doc = {
  id: string;
  path: string;
  text: string;
  editedAt: string;
};

type EditorState = {
  doc: Doc | null;
  open: (path: string, text: string) => void;
  replace: (text: string) => void;
};

export const useEditor = create<EditorState>()(
  immer((set) => ({
    doc: null,
    open: (path, text) => {
      set((state) => {
        state.doc = {
          id: nanoid(10),
          path,
          text,
          editedAt: formatISO(new Date()),
        };
      });
    },
    replace: (text) => {
      set((state) => {
        if (!state.doc) return;
        state.doc.text = text;
        state.doc.editedAt = formatISO(new Date());
      });
    },
  })),
);

export function readSettings(yamlText: string): EditorSettings {
  const parsed = yamlText.trim() ? parseYaml(yamlText) : {};
  const settings = Settings.parse(parsed ?? {});
  if (!semver.valid(settings.editor)) {
    throw new Error("editor must be a version");
  }
  if (!semver.gte(EDITOR_VERSION, settings.editor)) {
    throw new Error(
      `this editor is ${EDITOR_VERSION}; settings ask for ${settings.editor}`,
    );
  }
  return settings;
}

export function openDocument(path: string, text: string): Doc {
  useEditor.getState().open(path, text);
  const doc = useEditor.getState().doc;
  if (!doc) throw new Error("editor did not open a document");
  return doc;
}

export function stats(text: string, wrap: number) {
  const lines = text.split(/\r?\n/);
  const widest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    lines: lines.length,
    words: words(text).length,
    chars: text.length,
    overWrap: widest > wrap,
    preview: truncate(text.replace(/\s+/g, " ").trim(), { length: 80 }),
  };
}

export function normalizeText(text: string): string {
  return formatTxtContent(text).text;
}

export function markdownPreview(text: string): string {
  const html = marked.parse(text);
  if (typeof html !== "string") throw new Error("preview must be sync");
  return html;
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function NotePage(props: { title: string; body: string }) {
  return createElement(
    "article",
    null,
    createElement("h1", null, props.title),
    createElement("div", {
      dangerouslySetInnerHTML: { __html: props.body },
    }),
  );
}

export function previewDocument(title: string, text: string): string {
  const body = renderToStaticMarkup(
    createElement(NotePage, { title, body: markdownPreview(text) }),
  );
  return `<!doctype html><meta charset="utf-8"><title>${escapeText(title)}</title>${body}`;
}

export async function listTxt(dir: string): Promise<string[]> {
  const files = await fg("**/*.txt", {
    cwd: dir,
    dot: false,
    ignore: [
      "**/node_modules/**",
      "**/workspace/**",
      "**/reports/**",
      "**/.git/**",
    ],
  });
  return [...files].sort();
}

export async function fetchText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("only http and https urls are allowed");
  }
  const response = await axios.get<string>(parsed.toString(), {
    timeout: 8000,
    responseType: "text",
    maxContentLength: 1_000_000,
    maxBodyLength: 1_000_000,
    maxRedirects: 2,
  });
  if (typeof response.data !== "string")
    throw new Error("response was not text");
  return response.data;
}

export function readZipTxt(bytes: Uint8Array, entryName: string): string {
  const safe = safeRelativeTxtPath(entryName);
  if (!safe) throw new Error("unsafe zip path");
  const entry = analyseZip(bytes).find((item) => item.safePath === safe);
  if (!entry) throw new Error("txt entry not found");
  if (entry.text === null) {
    throw new Error(entry.textError ?? entry.error ?? "unreadable txt entry");
  }
  return entry.text;
}

export async function titleCard(title: string): Promise<Buffer> {
  const label = escapeText(
    truncate(title.trim() || "Untitled", { length: 48 }),
  );
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120">
  <rect width="640" height="120" fill="#111827"/>
  <text x="32" y="72" fill="#f9fafb" font-size="32" font-family="sans-serif">${label}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
