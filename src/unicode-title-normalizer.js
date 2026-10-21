"use strict";

const NAMED_COLORS = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  grey: [128, 128, 128],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 50],
};

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex -- matches ANSI ESC and BEL sequences
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;

const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi;

const COLOR_TOKEN_PATTERN =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|(?:rgba?|hsla?)\([^)]*\)/gi;

const ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function asString(value, name) {
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string`);
  }
  return value;
}

function clampByte(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHexByte(n) {
  return n.toString(16).padStart(2, "0");
}

function formatRgb(r, g, b, a) {
  const bytes = [r, g, b].map(clampByte);
  if (bytes.some((n) => n === null)) return null;
  let hex = `#${bytes.map(toHexByte).join("")}`;
  if (a !== undefined && a !== null) {
    const alpha = Number(a);
    if (!Number.isFinite(alpha)) return null;
    const clamped = Math.max(0, Math.min(1, alpha));
    if (clamped < 1) hex += toHexByte(Math.round(clamped * 255));
  }
  return hex;
}

function parseHex(input) {
  const body = input.slice(1);
  if (![3, 4, 6, 8].includes(body.length)) return null;
  const expanded =
    body.length <= 4 ? [...body].map((ch) => ch + ch).join("") : body;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a =
    expanded.length === 8
      ? parseInt(expanded.slice(6, 8), 16) / 255
      : undefined;
  return formatRgb(r, g, b, a);
}

function parseNumber(token) {
  const match = /^(-?\d+(?:\.\d+)?)(%?)$/.exec(token.trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (match[2]) return (value / 100) * 255;
  return value;
}

function parseAlpha(token) {
  if (token === undefined) return undefined;
  const match = /^(-?\d+(?:\.\d+)?)(%?)$/.exec(token.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return match[2] ? value / 100 : value;
}

function splitColorArgs(body) {
  const tokens = body
    .trim()
    .replace(/\s*\/\s*/, " / ")
    .split(/[\s,]+/)
    .filter(Boolean);
  const slash = tokens.indexOf("/");
  if (slash === -1) return tokens;
  return [...tokens.slice(0, slash), tokens[slash + 1]];
}

function parseRgbFunction(input) {
  const match = /^rgba?\((.*)\)$/i.exec(input.trim());
  if (!match) return null;
  const parts = splitColorArgs(match[1]);
  if (parts.length < 3 || parts.length > 4) return null;
  const [r, g, b] = parts.slice(0, 3).map(parseNumber);
  const a = parseAlpha(parts[3]);
  if ([r, g, b, a].some((n) => n === null)) return null;
  return formatRgb(r, g, b, a);
}

function hueToRgb(p, q, t) {
  let channel = t;
  if (channel < 0) channel += 1;
  if (channel > 1) channel -= 1;
  if (channel < 1 / 6) return p + (q - p) * 6 * channel;
  if (channel < 1 / 2) return q;
  if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
  return p;
}

function parseHue(token) {
  const match = /^(-?\d+(?:\.\d+)?)(deg|turn|rad)?$/i.exec(token.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] || "deg").toLowerCase();
  if (unit === "turn") return value * 360;
  if (unit === "rad") return (value * 180) / Math.PI;
  return value;
}

function parsePercent(token) {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(token.trim());
  if (!match) return null;
  return Number(match[1]) / 100;
}

function parseHslFunction(input) {
  const match = /^hsla?\((.*)\)$/i.exec(input.trim());
  if (!match) return null;
  const parts = splitColorArgs(match[1]);
  if (parts.length < 3 || parts.length > 4) return null;
  const hue = parseHue(parts[0]);
  const s = parsePercent(parts[1]);
  const l = parsePercent(parts[2]);
  const a = parseAlpha(parts[3]);
  if ([hue, s, l, a].some((n) => n === null)) return null;

  const h = (((hue % 360) + 360) % 360) / 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));
  if (sat === 0) {
    const gray = light * 255;
    return formatRgb(gray, gray, gray, a);
  }
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  return formatRgb(
    hueToRgb(p, q, h + 1 / 3) * 255,
    hueToRgb(p, q, h) * 255,
    hueToRgb(p, q, h - 1 / 3) * 255,
    a,
  );
}

function parseNamed(input) {
  const key = input
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const rgb = NAMED_COLORS[key];
  if (!rgb) return null;
  return formatRgb(rgb[0], rgb[1], rgb[2]);
}

/**
 * Canonicalize a CSS color to lowercase #rrggbb, or #rrggbbaa when alpha < 1.
 * Accepts hex, rgb()/rgba(), hsl()/hsla(), and CSS named colors.
 */
function normalizeColor(input) {
  const value = asString(input, "color").trim();
  if (!value) throw new TypeError("color must not be empty");
  const normalized =
    (value.startsWith("#") ? parseHex(value) : null) ||
    parseRgbFunction(value) ||
    parseHslFunction(value) ||
    parseNamed(value);
  if (!normalized) {
    throw new TypeError(`unrecognized color: ${input}`);
  }
  return normalized;
}

function tryNormalizeColor(token) {
  try {
    return normalizeColor(token);
  } catch {
    return null;
  }
}

function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body.toLowerCase())
      ? ENTITIES[body.toLowerCase()]
      : entity;
  });
}

function stripPresentation(input) {
  return decodeEntities(
    input.replace(ANSI_PATTERN, "").replace(HTML_TAG_PATTERN, ""),
  );
}

function stripInvisibles(input) {
  return input.replace(/[\p{Cc}\p{Cf}]/gu, "");
}

function collapseWhitespace(input) {
  return input.replace(/\s+/gu, " ").trim();
}

function titleCase(input) {
  return input
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/u.test(part)) return part;
      return part
        .split(/([-/'’])/u)
        .map((segment, index) => {
          if (index % 2 === 1 || segment.length === 0) return segment;
          const chars = [...segment];
          const [first, ...rest] = chars;
          return (
            first.toLocaleUpperCase("en-US") +
            rest.join("").toLocaleLowerCase("en-US")
          );
        })
        .join("");
    })
    .join("");
}

function normalizeInlineColors(input) {
  return input.replace(COLOR_TOKEN_PATTERN, (token) => {
    return tryNormalizeColor(token) || token;
  });
}

function resolveOptions(options) {
  return {
    form: "NFKC",
    titleCase: true,
    colors: true,
    ...options,
  };
}

/**
 * Normalize a title:
 * - strip ANSI colors and HTML tags
 * - drop control and format characters (zero-width, bidi marks)
 * - apply Unicode normalization (NFKC by default)
 * - collapse whitespace
 * - canonicalize embedded #hex / rgb() / hsl() colors
 * - title-case letters, including after hyphens and apostrophes
 */
function normalizeTitle(input, options) {
  const value = asString(input, "title");
  const opts = resolveOptions(options);
  const allowed = new Set(["NFC", "NFD", "NFKC", "NFKD"]);
  if (!allowed.has(opts.form)) {
    throw new TypeError(`unsupported normalization form: ${opts.form}`);
  }

  let text = stripInvisibles(stripPresentation(value)).normalize(opts.form);
  text = collapseWhitespace(text);
  if (opts.colors) text = normalizeInlineColors(text);
  if (opts.titleCase) text = titleCase(text);
  return text;
}

module.exports = {
  NAMED_COLORS,
  normalizeColor,
  normalizeTitle,
};
