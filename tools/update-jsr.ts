#!/usr/bin/env -S deno run --allow-read=. --allow-write=jsr.json
// Based on https://github.com/oscarotero/jsr-pub/blob/main/mod.ts

import { expandGlob } from "jsr:@std/fs@0.229.3/expand-glob";

const contents = JSON.parse(await Deno.readTextFile('jsr.json'));
contents.exports = await getExports([
  "./**/*.ts*",
]);
await Deno.writeTextFile('jsr.json', JSON.stringify(contents, null, 2) + '\n');

async function getExports(paths: string[]): Promise<Record<string, string>> {
  const exports: [string, string][] = [];
  const root = Deno.cwd();

  for (const path of paths) {
    for await (const entry of expandGlob(path, { root })) {
      if (entry.isDirectory) {
        continue;
      }
      const name = "." + entry.path.slice(root.length).replace(/\.tsx?$/, '');
      const target = "." + entry.path.slice(root.length);

      const modRegex = /\/mod$/;
      if (name.match(modRegex)) {
        exports.push([name.replace(modRegex, ''), target]);
        continue;
      }
      if (name.match(/\/support\/[^\/]+\//)) {
        continue;
      }

      if (!mustBeIgnored(target)) {
        exports.push([name, target]);

        if (name == './mod') {
          exports.push([".", target]);
        }
      }
    }
  }

  exports.sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(exports);
}

function mustBeIgnored(path: string): boolean {
  const extensions = [".ts", ".js", ".tsx", ".jsx", ".mjs"];
  const fileExtension = path.slice(path.lastIndexOf("."));

  if (!extensions.includes(fileExtension)) {
    return true;
  }

  return path.includes("/tests/") ||
    path.includes("/test/") ||
    path.includes("/docs/") ||
    path.includes("/deps.") ||
    path.includes("/deps/") ||
    path.includes("/node_modules/") ||
    path.endsWith(".d.ts") ||
    path.includes("/test.") ||
    path.includes(".test.") ||
    path.includes("_test.") ||
    path.includes("/bench.") ||
    path.includes(".bench.") ||
    path.includes("_bench.") ||
    path.includes("/.") ||
    path.includes("/_");
}
