import {
  create as createJwt,
  getNumericDate,
} from '@zaubrik/djwt';
import { LogicTracer } from "@cloudydeno/opentelemetry/instrumentation/async.ts";

const tracer = new LogicTracer({ name: 'github-app' });

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
