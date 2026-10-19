import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}
import { existsSync } from "node:fs";
let bad = 0;
const files = [...walk("src"), ...walk(".")].filter((p, i, a) => a.indexOf(p) === i && !p.startsWith("./scripts") && !p.startsWith("./node_modules"));
for (const p of files) {
  const src = readFileSync(p, "utf8");
  const rx = /^export\s+const\s+(\w+)\s*=/gm;
  let m;
  while ((m = rx.exec(src))) {
    const name = m[1];
    if (!new RegExp(`export\\s+const\\s+${name}\\s*:\\s*`).test(src)) {
      console.log(`${p}: ${name} missing annotation`);
      bad++;
    }
  }
}
if (bad > 0) process.exit(1);
console.log(`types ok (${files.length} files)`);
