import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const staticDir = path.join(root, ".next", "static");

// Token checks match the current minified CSS output, including selector shape.
const required = [
  ".bg-brand{",
  ".text-ink{",
  ".border-line{",
  ".bg-ok-bg{",
  ".font-sans{",
  ".disabled\\:bg-fill:disabled{",
  "--brand:",
  "font-family:var(--font-jakarta)",
];

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await cssFiles(full)));
    } else if (entry.name.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}

let files;
try {
  files = await cssFiles(staticDir);
} catch (error) {
  console.error(`No built CSS at ${staticDir}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No CSS files under ${staticDir}`);
  process.exit(1);
}

const css = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
const missing = required.filter((token) => !css.includes(token));

if (missing.length > 0) {
  console.error("Built CSS is missing theme output:");
  for (const token of missing) {
    console.error(`  ${token}`);
  }
  console.error("Checked:");
  for (const file of files) {
    console.error(`  ${path.relative(root, file)}`);
  }
  process.exit(1);
}

console.log(`Theme utilities present in ${files.length} CSS file(s).`);
