import { decodeBase64 } from "@std/encoding/base64";

export async function importPrivateKey(rawText: string): Promise<CryptoKey> {
  const keyText = rawText
    .replaceAll(/^[ \t]+/gm, '')
    .replaceAll('\\n', '\n') ?? '';
  const innerText = keyText
    .split('\n')
    .filter(x => x && !x.startsWith('-'))
    .join('');
  if (!innerText) throw new Error(`Missing Github Private Key`);

  let decodedKey: Uint8Array<ArrayBuffer>;
  if (keyText.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
    // Wrap PKCS#1 key with PKCS#8 ASN.1 structure, so importKey can understand it
    const rsaKey = decodeBase64(innerText);
    // PKCS#8 framing template:
    const header = decodeBase64('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKg=');
    // Concat the PKCS#8 key onto the framing:
    decodedKey = new Uint8Array(header.byteLength + rsaKey.byteLength);
    decodedKey.set(header, 0);
    decodedKey.set(rsaKey, header.byteLength);
    // Update the message length fields inside the framing to match:
    const view = new DataView(decodedKey.buffer);
    view.setUint16(2, decodedKey.byteLength - 4);
    view.setUint16(24, rsaKey.byteLength);
  } else if (keyText.startsWith('-----BEGIN PRIVATE KEY-----')) {
    decodedKey = decodeBase64(innerText);
  } else {
    throw new Error(`Unrecognizable private key header`);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    decodedKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );
}
