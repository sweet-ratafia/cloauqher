# analyse-zip-then-rezip-txt

Read a `.zip` buffer, describe each entry, and build a new `.zip` that contains only the `.txt` files.

```js
import { analyseZipThenRezipTxt } from "analyse-zip-then-rezip-txt";

const { entries, zip } = analyseZipThenRezipTxt(zipBytes);
```

`entries` lists every archive member. `zip` is a deflated archive of the `.txt` members, with their original bytes kept. Stored and deflated entries are read. Encrypted entries and other compression methods are reported and are not rewritten.

```js
import { packZip, safeRelativeTxtPath } from "analyse-zip-then-rezip-txt";

const archive = packZip([{ name: "notes/menu.txt", data: "hello\n" }]);
safeRelativeTxtPath("../secret.txt"); // null
```

Limits, so a hostile archive cannot be misread as a normal one:

- Zip64 and multi-disk archives are rejected instead of being parsed with the 32-bit fields.
- A declared uncompressed size above 32 MiB (override with `maxUncompressedBytes`) is not inflated.
- The end-of-central-directory comment length has to land on the end of the buffer, and the central directory has to start with its real signature.
- Unix directory entries are not treated as `.txt` files just because the name ends in `.txt`.
- When the UTF-8 flag is off, an Info-ZIP Unicode Path extra field (`0x7075`) supplies the name if its CRC matches.
- `textError` explains a `.txt` member that is not UTF-8 or could not be read.
- `safeRelativeTxtPath` is the path to use when writing an entry into a directory. `rezipTxt` still keeps the original entry name. Pass `{ skipUnreadable: true }` to leave unreadable `.txt` members out of the rebuilt archive instead of throwing.

```bash
npm test
```
