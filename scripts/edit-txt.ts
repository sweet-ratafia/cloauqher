/**
 * Small txt editor.
 *
 *   bun run edit -- list
 *   bun run edit -- show notes.txt
 *   bun run edit -- normalize notes.txt
 *   bun run edit -- preview notes.txt
 *   bun run edit -- card notes.txt
 *   bun run edit -- zip notes.zip notes/menu.txt
 *   bun run edit -- fetch https://example.com/notes.txt notes.txt
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import {
  fetchText,
  listTxt,
  normalizeText,
  openDocument,
  previewDocument,
  readSettings,
  readZipTxt,
  stats,
  titleCard,
} from "../src/txt-editor";

function settings() {
  const path = join(process.cwd(), "editor.yaml");
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  return readSettings(text);
}

function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? "Untitled"
  );
}

const program = new Command();
program.name("edit").description("Edit .txt notes");

program
  .command("list")
  .argument("[dir]", "directory to scan", ".")
  .action(async (dir: string) => {
    for (const file of await listTxt(dir)) console.log(file);
  });

program
  .command("show")
  .argument("<file>")
  .action((file: string) => {
    const text = readFileSync(file, "utf8");
    const doc = openDocument(file, text);
    const info = stats(doc.text, settings().wrap);
    console.log(chalk.bold(doc.path));
    console.log(chalk.dim(`${doc.id}  ${doc.editedAt}`));
    console.log(
      `${info.lines} lines, ${info.words} words, ${info.chars} chars`,
    );
    if (info.overWrap) {
      console.log(chalk.yellow(`a line is wider than ${settings().wrap}`));
    }
    console.log(chalk.dim(info.preview));
  });

program
  .command("normalize")
  .argument("<file>")
  .action((file: string) => {
    const next = normalizeText(readFileSync(file, "utf8"));
    writeFileSync(file, next);
    openDocument(file, next);
    console.log(chalk.green(`normalized ${file}`));
  });

program
  .command("preview")
  .argument("<file>")
  .action((file: string) => {
    const text = readFileSync(file, "utf8");
    const out = file.replace(/\.txt$/i, "") + ".preview.html";
    writeFileSync(out, previewDocument(firstLine(text), text));
    console.log(chalk.green(`wrote ${out}`));
  });

program
  .command("card")
  .argument("<file>")
  .action(async (file: string) => {
    const text = readFileSync(file, "utf8");
    const out = file.replace(/\.txt$/i, "") + ".card.png";
    writeFileSync(out, await titleCard(firstLine(text)));
    console.log(chalk.green(`wrote ${out}`));
  });

program
  .command("zip")
  .argument("<archive>")
  .argument("<entry>")
  .action((archive: string, entry: string) => {
    const text = readZipTxt(readFileSync(archive), entry);
    openDocument(`${archive}#${entry}`, text);
    process.stdout.write(text);
  });

program
  .command("fetch")
  .argument("<url>")
  .argument("<file>")
  .action(async (url: string, file: string) => {
    const text = await fetchText(url);
    writeFileSync(file, text);
    openDocument(file, text);
    console.log(chalk.green(`wrote ${file}`));
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "edit failed";
  console.error(chalk.red(message));
  process.exitCode = 1;
});
