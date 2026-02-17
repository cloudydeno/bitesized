import {
  create as createJwt,
  getNumericDate,
} from '@zaubrik/djwt';
import { decodeBase64 } from "@std/encoding/base64";
import { LogicTracer } from "@cloudydeno/opentelemetry/instrumentation/async.ts";

const tracer = new LogicTracer({ name: 'github-app' });

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
    const header = decodeBase64('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKg=');
    decodedKey = new Uint8Array(header.byteLength + rsaKey.byteLength);
    decodedKey.set(header, 0);
    decodedKey.set(rsaKey, header.byteLength);
    const view = new DataView(decodedKey.buffer);
    view.setUint16(header.byteLength - 2, rsaKey.byteLength);
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

export class GithubAppIdentity {
  constructor(
    public readonly clientId: string,
    private readonly privateKey: CryptoKey,
  ) {}

  @tracer.InternalSpan
  async createGithubJwt(): Promise<string> {
    return await createJwt({
      'alg': 'RS256',
      'typ': 'JWT',
    }, {
      'iss': this.clientId,
      'exp': getNumericDate(5 * 60),
      'iat': getNumericDate(0),
      'nbf': getNumericDate(-5),
    }, this.privateKey);
  }

  @tracer.InternalSpan
  async fetchInstallationCredential(
    installationId: string,
    params: {
      repositories?: string[],
      permissions?: Record<string, 'read' | 'write' | undefined>,
    },
  ) {
    const resp = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/vnd.github+json',
        'authorization': `Bearer ${await this.createGithubJwt()}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(params),
    });
    if (!resp.ok) {
      console.error(JSON.stringify({
        message: `Github returned HTTP ${resp.status} when creating installation token`,
        requestId: resp.headers.get('x-github-request-id'),
        responseType: resp.headers.get('content-type'),
        responseBody: (await resp.text()).slice(0, 100),
      }));
      throw new Error(`HTTP ${resp.status} from Github when creating installation token`);
    }
    const data = await resp.json();
    return data as {
      token: string;
      expires_at: string;
    };
  }
}
