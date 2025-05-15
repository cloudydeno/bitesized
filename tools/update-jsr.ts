#!/usr/bin/env -S deno run --allow-run=find --allow-read=jsr.json --allow-write=jsr.json
// Based on https://github.com/oscarotero/jsr-pub/blob/main/mod.ts

const contents = JSON.parse(await Deno.readTextFile('jsr.json'));
contents.exports = await getExports("./**/*.ts*");
await Deno.writeTextFile('jsr.json', JSON.stringify(contents, null, 2) + '\n');

async function getExports(pathPattern: string): Promise<Record<string, string>> {
  const exports: [string, string][] = [];

  const result = await new Deno.Command('find', {
    args: ['.',
      '-wholename', pathPattern,
      '-type', 'f',
    ],
    stdout: 'piped',
  }).output();
  if (!result.success) throw new Error(`find returned exit code ${result.code}`);

  const fileList = new TextDecoder().decode(result.stdout).split('\n');
  for (const path of fileList) {
    if (!path) continue;
    const name = path.replace(/\.tsx?$/, '');
    const target = path;

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
