export type ZipEntry = {
  name: string;
  txt: boolean;
  directory: boolean;
  method: string;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  text: string | null;
  error: string | null;
  textError: string | null;
  /** Safe relative `.txt` path, or null when the name must not be extracted. */
  safePath: string | null;
};

export type ZipReadOptions = {
  /** Entries that declare a larger uncompressed size are not inflated. Default: 32 MiB. */
  maxUncompressedBytes?: number;
  /** When true, unreadable `.txt` entries are omitted from the rebuilt archive. */
  skipUnreadable?: boolean;
};

export type ZipPackFile = {
  name: string;
  data: Uint8Array | string;
};

export function analyseZip(
  input: Uint8Array,
  options?: ZipReadOptions,
): ZipEntry[];

export function rezipTxt(
  input: Uint8Array,
  options?: ZipReadOptions,
): Uint8Array;

export function analyseZipThenRezipTxt(
  input: Uint8Array,
  options?: ZipReadOptions,
): {
  entries: ZipEntry[];
  zip: Uint8Array;
};

export function packZip(files: readonly ZipPackFile[]): Uint8Array;

export function safeRelativeTxtPath(name: string): string | null;
