import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { deflateRawSync } from "node:zlib";
import test from "node:test";
import {
  analyseZip,
  analyseZipThenRezipTxt,
  packZip,
  safeRelativeTxtPath,
} from "../index.js";

function crc32(data) {
  let crc = 0xffffffff;
  for (const value of data) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = file.nameBytes ?? Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.data);
    const extra = file.extra ? Buffer.from(file.extra) : Buffer.alloc(0);
    const flags = file.flags ?? 0x800;
    const method = file.method ?? 0;
    const checksum = file.checksum ?? crc32(data);
    const payload = method === 8 ? deflateRawSync(data) : data;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    const chunk = Buffer.concat([local, name, extra, payload]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(offset, 42);
    locals.push(chunk);
    centrals.push(Buffer.concat([central, name, extra]));
    offset += chunk.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, eocd]);
}

function centralOffset(zip) {
  return zip.indexOf(Buffer.from("504b0102", "hex"));
}

test("analyses every entry and re-zips only txt files", () => {
  const source = storedZip([
    { name: "notes/readme.md", data: "# keep me out\n" },
    { name: "notes/a.TXT", data: "café\n", method: 8 },
    { name: "empty.txt", data: "" },
  ]);

  const result = analyseZipThenRezipTxt(source);

  assert.deepEqual(
    result.entries.map((entry) => [
      entry.name,
      entry.txt,
      entry.text,
      entry.safePath,
    ]),
    [
      ["notes/readme.md", false, null, null],
      ["notes/a.TXT", true, "café\n", "notes/a.TXT"],
      ["empty.txt", true, "", "empty.txt"],
    ],
  );
  assert.equal(result.entries[1].method, "deflate");
  assert.equal(result.entries[1].textError, null);

  const rebuilt = analyseZipThenRezipTxt(result.zip);
  assert.deepEqual(
    rebuilt.entries.map((entry) => [entry.name, entry.text, entry.error]),
    [
      ["notes/a.TXT", "café\n", null],
      ["empty.txt", "", null],
    ],
  );
});

test("rejects a buffer that is not a zip", () => {
  assert.throws(
    () => analyseZipThenRezipTxt(Buffer.from("hello")),
    /not a zip/,
  );
  assert.throws(() => analyseZip(Buffer.alloc(0)), /not a zip/);
});

test("packs an empty archive and reports non-utf8 txt", () => {
  const empty = analyseZip(packZip([]));
  assert.deepEqual(empty, []);

  const binary = analyseZip(
    storedZip([{ name: "bin.txt", data: Buffer.from([0xff, 0xfe, 0x00]) }]),
  );
  assert.equal(binary[0].text, null);
  assert.equal(binary[0].textError, "not utf-8 text");
  assert.equal(binary[0].safePath, "bin.txt");
});

test("rejects zip64 markers, spanned disks, and oversized entries", () => {
  const source = storedZip([{ name: "a.txt", data: "hello" }]);
  const zip64 = Buffer.from(source);
  zip64.writeUInt32LE(0xffffffff, centralOffset(zip64) + 24);
  assert.equal(analyseZip(zip64)[0].error, "zip64 entries are not supported");

  const multi = Buffer.from(source);
  multi.writeUInt16LE(1, multi.length - 22 + 4);
  assert.throws(() => analyseZip(multi), /multi-disk/);

  assert.equal(
    analyseZip(source, { maxUncompressedBytes: 2 })[0].error,
    "uncompressed entry exceeds limit",
  );
});

test("reads the unicode path extra field and skips unreadable txt when asked", () => {
  const nameBytes = Buffer.from("hi.txt", "latin1");
  const utf8Name = Buffer.from("hello.txt", "utf8");
  const payload = Buffer.alloc(1 + 4 + utf8Name.length);
  payload[0] = 1;
  payload.writeUInt32LE(crc32(nameBytes), 1);
  utf8Name.copy(payload, 5);
  const extra = Buffer.alloc(4 + payload.length);
  extra.writeUInt16LE(0x7075, 0);
  extra.writeUInt16LE(payload.length, 2);
  payload.copy(extra, 4);

  const source = storedZip([
    { nameBytes, data: "from-extra\n", flags: 0, extra },
    { name: "secret.txt", data: "hidden", flags: 0x800 | 0x1 },
    { name: "keep.txt", data: "keep\n" },
  ]);
  const [unicode, encrypted, keep] = analyseZip(source);
  assert.equal(unicode.name, "hello.txt");
  assert.equal(unicode.text, "from-extra\n");
  assert.equal(encrypted.error, "encrypted entries are not read");
  assert.equal(keep.text, "keep\n");
  assert.throws(
    () => analyseZipThenRezipTxt(source),
    /encrypted entries are not read/,
  );

  const skipped = analyseZipThenRezipTxt(source, { skipUnreadable: true });
  assert.deepEqual(
    skipped.entries.filter((entry) => entry.text).map((entry) => entry.name),
    ["hello.txt", "keep.txt"],
  );
  assert.deepEqual(
    analyseZip(skipped.zip).map((entry) => entry.text),
    ["from-extra\n", "keep\n"],
  );
});

test("does not treat a unix directory as a txt file", () => {
  const source = storedZip([{ name: "dir.txt", data: "nope" }]);
  const central = centralOffset(source);
  source.writeUInt8(3, central + 5);
  source.writeUInt32LE(0o040755 << 16, central + 38);
  const [entry] = analyseZip(source);
  assert.equal(entry.directory, true);
  assert.equal(entry.txt, false);
  assert.equal(entry.text, null);
});

test("classifies safe txt paths", () => {
  assert.equal(safeRelativeTxtPath("notes/a.TXT"), "notes/a.TXT");
  assert.equal(safeRelativeTxtPath("notes\\a.txt"), "notes/a.txt");
  assert.equal(safeRelativeTxtPath("../secret.txt"), null);
  assert.equal(safeRelativeTxtPath("/tmp/a.txt"), null);
  assert.equal(safeRelativeTxtPath("C:/a.txt"), null);
  assert.equal(safeRelativeTxtPath("notes/readme.md"), null);
  assert.equal(safeRelativeTxtPath("notes/./a.txt"), "notes/a.txt");
});
