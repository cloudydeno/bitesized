/**
 * Describes parameters for a fetch() request, including extra fields
 * for building the request URL and providing JSON request bodies.
 */
export interface ApiRequestInit extends RequestInit {
  path: string;
  bodyJson?: unknown;
  accept?: string;
  query?: Record<string,
    | null | undefined
    | string | number | boolean
    | Array<string | number | boolean>
  >;
};

export interface ApiClient {
  /** Helper to send API requests and parse resulting JSON */
  fetchJson<Tresp = unknown>(requestInit: ApiRequestInit): Promise<Tresp>;
}

export type ApiClientConfig = {
  headerFactory?: () => Record<string,string> | Promise<Record<string,string>>;
  baseUrl: string;
  customFetch?: typeof fetch;
}

export class BaseApiClient implements ApiClient {
  constructor(private readonly coreConfig: ApiClientConfig) {}

  async fetchJson<Tresp = unknown>(
    init: ApiRequestInit,
  ): Promise<Tresp> {
    const resp = await this.fetchResp({
      accept: 'application/json',
      ...init,
    })
    return await resp.json();
  }

  async fetchText(
    init: ApiRequestInit,
  ): Promise<string> {
    const resp = await this.fetchResp({
      accept: 'text/plain',
      ...init,
    })
    return await resp.text();
  }

  async fetchResp({
    path,
    bodyJson,
    query,
    accept,
    ...init
  }: ApiRequestInit): Promise<Response> {

    const url = new URL(path, this.coreConfig.baseUrl);
    for (const item of Object.entries(query ?? {})) {
      if (item[1] == null) continue;
      if (Array.isArray(item[1])) {
        for (const x of item[1]) {
          url.searchParams.append(item[0], x as string);
        }
      } else {
        url.searchParams.set(item[0], item[1] as string);
      }
    }

    const resp = await (this.coreConfig.customFetch ?? fetch)(url, {
      headers: {
        'accept': accept ?? '',
        ...bodyJson != null
          ? { 'content-type': 'application/json' }
          : {},
        ...this.coreConfig.headerFactory
          ? await this.coreConfig.headerFactory()
          : {},
        ...init.headers,
      },
      ...bodyJson != null ? {
        body: JSON.stringify(bodyJson),
       } : {},
      ...init,
    });

    if (!resp.ok) {
      const respText = await resp.text();
      if (resp.status == 500 && respText.length < 1024) {
        throw new Error(`Server Error:\n${respText}`);
      }
      throw new Error(`HTTP ${resp.status} from ${path}:\n${respText.slice(0, 2048)}`);
    }

    return resp;
  }

}
