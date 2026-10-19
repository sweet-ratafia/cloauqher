import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".ts") ? [path] : [];
  });
}

const files = [...walk("src"), ...walk("tests"), "bu.ts", "fi.ts"];
let failures = 0;
for (const file of files) {
  if (/\t|[ \t]+\n/.test(readFileSync(file, "utf8"))) {
    console.error(`Whitespace violation: ${file}`);
    failures++;
  }
}
if (failures) process.exit(1);
console.log(`format ok (${files.length} files)`);

// Record the most recent successful local formatting check.
mkdirSync(".bun-cache", { recursive: true });
writeFileSync(".bun-cache/format-ran", new Date().toISOString() + "\n");
