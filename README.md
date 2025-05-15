# @cloudydeno/bitesized [![CI](https://github.com/cloudydeno/deno-bitesized/actions/workflows/deno-ci.yml/badge.svg)](https://github.com/cloudydeno/deno-bitesized/actions/workflows/deno-ci.yml)
A collection of individual, unrelated, low movement TypeScript modules.

## JSR Package
This package does not have a central export.
You are to select your desired module and import it directly.
All modules and their exports are listed on JSR: https://jsr.io/@cloudydeno/bitesized/doc

Example:

```ts
import { filesize } from 'jsr:@cloudydeno/bitesized/formatting/filesize';
console.log(`That's ${filesize(10000000)}!`);
// That's 9.54 MB!
```

## Tools install

```shell
# from git:
deno install --global tools/gha.ts --allow-read --allow-run --allow-env --config=deno.json
# from published release:
deno install --global jsr:@cloudydeno/bitesized/tools/gha --allow-read --allow-run --allow-env
```

## Archived `crux.land` URLs
Before JSR, each individual file was uploaded to crux.land which serves as immutable hosting of independent modules.
These URLs still work but new commits here are not uploaded to crux.land anymore.

| Module | Permanent URL |
|---|---|
| `crypto/curve25519.ts` | [https://crux.land/2LzJT5](https://crux.land/2LzJT5#curve25519) |
| `formatting/filesize.ts` | [https://crux.land/6wZ5Sz](https://crux.land/6wZ5Sz#filesize) |
| `formatting/ini.ts` | [https://crux.land/6mMyhY](https://crux.land/6mMyhY#ini) |
| `integrations/firebase-hosting-deploy.ts` | [https://crux.land/2rY57Q](https://crux.land/2rY57Q#firebase-hosting-deploy) |
| `integrations/google-metadata-service.ts` | [https://crux.land/2EPu5b](https://crux.land/2EPu5b#google-metadata-service) |
| `integrations/google-service-account.ts` | [https://crux.land/32WBxC](https://crux.land/32WBxC#google-service-account) |
| `integrations/shorten-url.ts` | [https://crux.land/34Gcvo](https://crux.land/34Gcvo#shorten-url) |
| `kv/oidc-issuer.ts` | [https://crux.land/7Em466](https://crux.land/7Em466#oidc-issuer) |
| `logic/async-cache.ts` | [https://crux.land/67XrpW](https://crux.land/67XrpW#async-cache) |
| `logic/combine-iterators.ts` | [https://crux.land/7Ed9a6](https://crux.land/7Ed9a6#combine-iterators) |
| `logic/factory-map.ts` | [https://crux.land/4x3qJT](https://crux.land/4x3qJT#factory-map) |
| `logic/fixed-interval.ts` | [https://crux.land/4MC9JG](https://crux.land/4MC9JG#fixed-interval) |
| `logic/set-util.ts` | [https://crux.land/4y3NGo](https://crux.land/4y3NGo#set-util) |
| `streams/transform-text.ts` | [https://crux.land/3U9C6W](https://crux.land/3U9C6W#transform-text) |
| `system/sub-process.ts` | [https://crux.land/Ho2DP](https://crux.land/Ho2DP#sub-process) |
| `system/terminal-input.ts` | [https://crux.land/54hcT](https://crux.land/54hcT#terminal-input) |
| `tools/crux-publish.ts` | [https://crux.land/5LmSf7](https://crux.land/5LmSf7#crux-publish) |
| `tools/gha.ts` | [https://crux.land/37p4G7](https://crux.land/37p4G7#gha) |
