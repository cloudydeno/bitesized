// Deno implmentation of these steps:
//   https://firebase.google.com/docs/hosting/api-deploy
// You need to provide an API token with scope:
//   "https://www.googleapis.com/auth/firebase" (not a URL)
// This script can get an API token from a Service Account .json:
//   https://danopia.net/deno/google-service-account@v1.ts
// Online documentation:
//   https://doc.deno.land/https/danopia.net/deno/firebase-hosting-deploy@v1.ts

import { encodeHex } from '@std/encoding/hex';

export type SiteFile = {path: string, body: Uint8Array};
export async function deployFirebaseSite(opts: {
  siteId: string;
  channelId?: string;
  channelConfig?: unknown;
  accessToken: string;
  files: Iterable<SiteFile>;
  siteConfig?: unknown;
}): Promise<Record<string,unknown>> {
  const authorization = `Bearer ${opts.accessToken}`;
  const jsonHeaders = {
    authorization,
    'content-type': 'application/json',
  };

  if (opts.channelId && opts.channelConfig) {
    const params = new URLSearchParams({ channelId: opts.channelId });
    const channel = await fetch(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${opts.siteId}/channels?${params}`, {
        method: 'POST',
        body: JSON.stringify(opts.channelConfig),
        headers: jsonHeaders,
      }).then(x => x.json());
    if (channel.error?.code == 409) {
      console.log('Firebase site channel', opts.channelId, 'already exists :)');
    } else if (channel.url) {
      console.log('Firebase site channel', opts.channelId, 'has been created @', channel.url);
    } else throw new Error(
      `Channel creation failed: ${channel.error.message || JSON.stringify(channel)}`);
  }

  const {name, status} = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${opts.siteId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        config: opts.siteConfig,
      }),
      headers: jsonHeaders,
    }).then(x => x.json()) as {name: string; status: string};
  console.log('Firebase release', name, 'is', status);

  const fileHashes: Record<string,string> = Object.create(null);
  const hashMap = new Map<string,SiteFile&{compressed: Uint8Array}>();
  for (const file of opts.files) {

    const compressed = await gzipEncode(file.body);
    const hashBytes = await crypto.subtle.digest('SHA-256', compressed);
    const hash = encodeHex(hashBytes);
    hashMap.set(hash, {...file, compressed});
    fileHashes[file.path] = hash;
  }

  let {uploadRequiredHashes, uploadUrl} = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/${name}:populateFiles`, {
      method: 'POST',
      body: JSON.stringify({
        files: fileHashes,
      }),
      headers: jsonHeaders,
    }).then(x => x.json()) as {uploadRequiredHashes: string[], uploadUrl: string};
  uploadRequiredHashes = uploadRequiredHashes ?? [];
  console.log('Firebase wants', uploadRequiredHashes.length, 'files out of', hashMap.size);

  for (const requiredHash of uploadRequiredHashes) {
    const file = hashMap.get(requiredHash);
    if (!file) throw new Error(`BUG: firebase wanted hash ${requiredHash} which we didn't offer`);

    const resp = await fetch(uploadUrl+'/'+requiredHash, {
      method: 'POST',
      body: file.compressed,
      headers: { authorization,
        'content-type': 'application/octet-stream',
      },
    });
    if (resp.status !== 200) throw new Error(`Firebase file upload returned ${resp.status}`);
    const compRatio = (file.body.length - file.compressed.length) / file.body.length;
    console.log('Uploaded', file.path, '-', Math.round(compRatio * 100), '% compression');
  }

  const release = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1/${name}?update_mask=status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'FINALIZED',
      }),
      headers: jsonHeaders,
    }).then(x => x.json());
  console.log('Completed Firebase release:', release.name);

  const deployParams = new URLSearchParams([['versionName', name]]);
  const channelPath = `/sites/${opts.siteId}${opts.channelId ? `/channels/${opts.channelId}` : ''}`;
  const deploy = await fetch(
    `https://firebasehosting.googleapis.com/v1beta1${channelPath}/releases?${deployParams}`, {
      method: 'POST',
      headers: { authorization, 'content-length': '0' },
    }).then(x => x.json());
  console.log('Completed Firebase deploy:', deploy.name, '@', deploy.releaseTime);
  return deploy;
}

async function gzipEncode(str: Uint8Array): Promise<Uint8Array> {
  const stream = ReadableStream.from([str])
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
