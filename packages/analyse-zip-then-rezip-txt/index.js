import { Buffer } from "node:buffer";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x800;
const ENCRYPTED_FLAG = 0x1;
const UNICODE_PATH_EXTRA = 0x7075;
const DEFAULT_MAX_UNCOMPRESSED = 32 * 1024 * 1024;

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let crc = n;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[n] = crc >>> 0;
}

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  throw new TypeError("zip input must be a Buffer or Uint8Array");
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readOptions(options) {
  const maxUncompressedBytes =
    options?.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED;
  if (!Number.isInteger(maxUncompressedBytes) || maxUncompressedBytes < 0) {
    throw new TypeError("maxUncompressedBytes must be a non-negative integer");
  }
  return {
    maxUncompressedBytes,
    skipUnreadable: options?.skipUnreadable === true,
  };
}

function findEocd(zip) {
  if (zip.length < 22) throw new Error("not a zip archive");
  const min = Math.max(0, zip.length - 22 - 0xffff);
  for (let offset = zip.length - 22; offset >= min; offset -= 1) {
    if (zip.readUInt32LE(offset) !== EOCD_SIGNATURE) continue;
    const commentLength = zip.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength !== zip.length) continue;
    const count = zip.readUInt16LE(offset + 10);
    const directorySize = zip.readUInt32LE(offset + 12);
    const directoryOffset = zip.readUInt32LE(offset + 16);
    const directoryLooksValid =
      count === 0 ||
      (directoryOffset + 4 <= zip.length &&
        zip.readUInt32LE(directoryOffset) === CENTRAL_SIGNATURE);
    if (!directoryLooksValid) continue;
    if (
      count === 0xffff ||
      directoryOffset === 0xffffffff ||
      directorySize === 0xffffffff
    ) {
      throw new Error("zip64 archives are not supported");
    }
    return offset;
  }
  throw new Error("not a zip archive");
}

function decodeName(bytes, flags) {
  return flags & UTF8_FLAG ? bytes.toString("utf8") : bytes.toString("latin1");
}

function unicodeName(extra, nameBytes) {
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const id = extra.readUInt16LE(offset);
    const size = extra.readUInt16LE(offset + 2);
    const start = offset + 4;
    if (size > extra.length - start) return null;
    if (id === UNICODE_PATH_EXTRA && size >= 5 && extra[start] === 1) {
      const nameCrc = extra.readUInt32LE(start + 1);
      if (nameCrc === crc32(nameBytes)) {
        return extra.subarray(start + 5, start + size).toString("utf8");
      }
    }
    offset = start + size;
  }
  return null;
}

function methodName(method) {
  if (method === 0) return "store";
  if (method === 8) return "deflate";
  return `unsupported:${method}`;
}

function isDirectoryEntry(name, versionMadeBy, externalAttrs) {
  if (name.endsWith("/")) return true;
  const host = versionMadeBy >>> 8;
  const unixMode = (externalAttrs >>> 16) & 0o170000;
  if (host === 3 || unixMode !== 0) return unixMode === 0o040000;
  return (externalAttrs & 0x10) !== 0;
}

function isTxtName(name, directory) {
  return !directory && name.toLowerCase().endsWith(".txt");
}

/**
 * Relative `.txt` path that cannot escape a destination directory.
 * Returns null for absolute paths, `..` segments, non-txt names, and NUL bytes.
 */
export function safeRelativeTxtPath(name) {
  if (typeof name !== "string" || name.length === 0 || name.includes("\0")) {
    return null;
  }
  const normalized = name.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) return null;
  const parts = [];
  for (const part of normalized.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") return null;
    parts.push(part);
  }
  if (parts.length === 0) return null;
  const base = parts[parts.length - 1] ?? "";
  if (!base.toLowerCase().endsWith(".txt")) return null;
  return parts.join("/");
}

function readEntries(zip, options) {
  const eocd = findEocd(zip);
  const diskNumber = zip.readUInt16LE(eocd + 4);
  const directoryDisk = zip.readUInt16LE(eocd + 6);
  if (diskNumber === 0xffff || directoryDisk === 0xffff) {
    throw new Error("zip64 archives are not supported");
  }
  if (diskNumber !== 0 || directoryDisk !== 0) {
    throw new Error("multi-disk zip archives are not supported");
  }
  const count = zip.readUInt16LE(eocd + 10);
  const directorySize = zip.readUInt32LE(eocd + 12);
  const directoryOffset = zip.readUInt32LE(eocd + 16);
  if (
    directoryOffset > zip.length ||
    directorySize > zip.length - directoryOffset
  ) {
    throw new Error("zip central directory is truncated");
  }

  const entries = [];
  let cursor = directoryOffset;
  const end = directoryOffset + directorySize;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > end)
      throw new Error("zip central directory is truncated");
    if (zip.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new Error("zip central directory is invalid");
    }
    const versionMadeBy = zip.readUInt16LE(cursor + 4);
    const flags = zip.readUInt16LE(cursor + 8);
    const method = zip.readUInt16LE(cursor + 10);
    const checksum = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const uncompressedSize = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const diskStart = zip.readUInt16LE(cursor + 34);
    const externalAttrs = zip.readUInt32LE(cursor + 38);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > end) throw new Error("zip central directory is truncated");
    const nameBytes = zip.subarray(cursor + 46, cursor + 46 + nameLength);
    const extra = zip.subarray(
      cursor + 46 + nameLength,
      cursor + 46 + nameLength + extraLength,
    );
    let name = decodeName(nameBytes, flags);
    if ((flags & UTF8_FLAG) === 0) {
      name = unicodeName(extra, nameBytes) ?? name;
    }
    cursor = recordEnd;

    const directory = isDirectoryEntry(name, versionMadeBy, externalAttrs);
    let data = null;
    let error = null;
    const zip64 =
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset === 0xffffffff;
    if (directory) {
      data = null;
    } else if (zip64) {
      error = "zip64 entries are not supported";
    } else if (diskStart !== 0) {
      error = "entry is on another disk";
    } else if (uncompressedSize > options.maxUncompressedBytes) {
      error = "uncompressed entry exceeds limit";
    } else if (localOffset + 30 > zip.length) {
      error = "local header is truncated";
    } else if (zip.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
      error = "local header is invalid";
    } else if (flags & ENCRYPTED_FLAG) {
      error = "encrypted entries are not read";
    } else if (method !== 0 && method !== 8) {
      error = `unsupported compression method ${method}`;
    } else {
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      if (dataOffset > zip.length || compressedSize > zip.length - dataOffset) {
        error = "entry data is truncated";
      } else {
        const compressed = zip.subarray(
          dataOffset,
          dataOffset + compressedSize,
        );
        try {
          data =
            method === 0
              ? Buffer.from(compressed)
              : inflateRawSync(compressed, {
                  maxOutputLength: Math.max(uncompressedSize, 1),
                });
        } catch {
          error = "deflate data is invalid";
        }
        if (data && data.length !== uncompressedSize) {
          error = "uncompressed size does not match entry data";
          data = null;
        }
        if (data && crc32(data) !== checksum) {
          error = "crc32 does not match entry data";
          data = null;
        }
      }
    }

    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      crc32: checksum,
      directory,
      txt: isTxtName(name, directory),
      data,
      error,
    });
  }
  return entries;
}

function textOf(entry) {
  if (!entry.txt || entry.directory) return { text: null, textError: null };
  if (!entry.data) {
    return { text: null, textError: entry.error ?? "unreadable entry" };
  }
  const text = entry.data.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(entry.data)) {
    return { text: null, textError: "not utf-8 text" };
  }
  return { text, textError: null };
}

function describe(entry) {
  const text = textOf(entry);
  return {
    name: entry.name,
    txt: entry.txt,
    directory: entry.directory,
    method: methodName(entry.method),
    compressedSize: entry.compressedSize,
    uncompressedSize: entry.uncompressedSize,
    crc32: entry.crc32,
    text: text.text,
    error: entry.error,
    textError: text.textError,
    safePath: entry.txt ? safeRelativeTxtPath(entry.name) : null,
  };
}

export function analyseZip(input, options) {
  const zip = asBuffer(input);
  return readEntries(zip, readOptions(options)).map(describe);
}

function fileData(data) {
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new TypeError("zip entry data must be a string, Buffer, or Uint8Array");
}

function buildZip(files) {
  if (files.length > 0xffff)
    throw new Error("zip64 archives are not supported");
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf8");
    if (nameBytes.length > 0xffff) {
      throw new Error(`${file.name}: zip entry name is too long`);
    }
    const compressed = deflateRawSync(file.data);
    const checksum = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIGNATURE, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const localChunk = Buffer.concat([local, nameBytes, compressed]);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIGNATURE, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBytes]));
    locals.push(localChunk);
    offset += localChunk.length;
    if (offset > 0xffffffff)
      throw new Error("zip64 archives are not supported");
  }

  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, eocd]);
}

function txtFiles(entries, options) {
  const txt = entries.filter((entry) => entry.txt);
  if (!options.skipUnreadable) {
    const unreadable = txt.find((entry) => !entry.data);
    if (unreadable) {
      throw new Error(`${unreadable.name}: ${unreadable.error}`);
    }
  }
  return txt.filter((entry) => entry.data);
}

export function rezipTxt(input, options) {
  const resolved = readOptions(options);
  const entries = readEntries(asBuffer(input), resolved);
  return buildZip(txtFiles(entries, resolved));
}

export function analyseZipThenRezipTxt(input, options) {
  const resolved = readOptions(options);
  const entries = readEntries(asBuffer(input), resolved);
  return {
    entries: entries.map(describe),
    zip: buildZip(txtFiles(entries, resolved)),
  };
}

export function packZip(files) {
  if (!Array.isArray(files)) throw new TypeError("files must be an array");
  return buildZip(
    files.map((file) => {
      if (!file || typeof file.name !== "string" || file.name.length === 0) {
        throw new TypeError("zip entry name must be a non-empty string");
      }
      return { name: file.name, data: fileData(file.data) };
    }),
  );
}
