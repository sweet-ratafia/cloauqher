import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
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

const SAFE_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "em",
  "strong",
  "code",
  "pre",
  "blockquote",
  "br",
  "hr",
  "a",
  "del",
]);

function safeHref(value: string): string | null {
  const href = value.trim();
  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("./")) {
    return href.includes(":") || href.includes("//") ? null : href;
  }
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g, (tag, name, attrs) => {
    const tagName = String(name).toLowerCase();
    if (!SAFE_TAGS.has(tagName)) return "";
    if (tag.startsWith("</")) return `</${tagName}>`;
    if (tagName !== "a") return `<${tagName}>`;
    const href = /\bhref\s*=\s*"([^"]*)"/i.exec(String(attrs));
    const safe = href ? safeHref(href[1] ?? "") : null;
    return safe ? `<a href="${escapeText(safe)}">` : "<a>";
  });
}

export function markdownPreview(text: string): string {
  const source = text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const html = marked.parse(source);
  if (typeof html !== "string") throw new Error("preview must be sync");
  return sanitizeHtml(html);
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function NotePage(props: { title: string }) {
  return createElement("article", null, createElement("h1", null, props.title));
}

export function previewDocument(title: string, text: string): string {
  const article = renderToStaticMarkup(
    createElement(NotePage, { title }),
  ).replace("</article>", `${markdownPreview(text)}</article>`);
  return [
    "<!doctype html>",
    '<meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">',
    `<title>${escapeText(title)}</title>`,
    article,
  ].join("");
}

export async function listTxt(dir: string): Promise<string[]> {
  const files = await fg("**/*.txt", {
    cwd: dir,
    dot: false,
    followSymbolicLinks: false,
    ignore: [
      "**/node_modules/**",
      "**/workspace/**",
      "**/reports/**",
      "**/.git/**",
    ],
  });
  return [...files].sort();
}

function isBlockedIp(address: string): boolean {
  let ip = address.toLowerCase().split("%")[0] ?? address;
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    if (isIP(mapped) === 4) ip = mapped;
  }
  if (ip === "::" || ip === "::1") return true;
  if (isIP(ip) === 6) {
    return ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff");
  }
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return true;
  const nums = parts.map((part) => Number(part));
  if (nums.some((part) => part > 255)) return true;
  const a = nums[0] ?? 0;
  const b = nums[1] ?? 0;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.username || url.password) {
    throw new Error("urls with credentials are not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host.toLowerCase() === "localhost" || host.toLowerCase().endsWith(".localhost")) {
    throw new Error("private hosts are not allowed");
  }
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error("private hosts are not allowed");
    return;
  }
  let records: { address: string }[];
  try {
    records = await dnsLookup(host, { all: true });
  } catch {
    throw new Error("could not resolve host");
  }
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("private hosts are not allowed");
  }
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
  await assertPublicHttpUrl(parsed);
  const response = await axios.get<string>(parsed.toString(), {
    timeout: 8000,
    responseType: "text",
    headers: { Accept: "text/plain, text/*, */*;q=0.1" },
    maxContentLength: 1_000_000,
    maxBodyLength: 1_000_000,
    maxRedirects: 0,
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
