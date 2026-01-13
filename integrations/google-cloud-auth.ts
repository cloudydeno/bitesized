import { SubProcess } from "../system/sub-process.ts";
import { fetchServiceAccountToken, type TokenResponse } from "./google-metadata-service.ts";

/**
 * Attempts to get a GCP auth token from two possible sources:
 * 1. A service account token from the GCP Metadata Server.
 * 2. A user token from the installed `gcloud` CLI.
 * If neither source is available, throws an Error.
 * Returns an object including the token's remaining lifespan.
 */
export async function fetchGoogleCloudAuth(): Promise<TokenResponse> {
  const reasons = [`No Google Cloud access token found. Encountered issues:`];

  try {
    const resp = await fetchServiceAccountToken();
    return resp;
  } catch (thrown) {
    const err = thrown as Error;
    const parts = err.message.split(': ');
    if (parts.includes('failed to lookup address information')) {
      reasons.push(`  - Metadata Server not available: ${parts.slice(-1)[0]}`);
    } else {
      reasons.push(`  - Metadata Server: ${err.message}`);
    }
  }

  try {
    const proc = new SubProcess('gcloud', {
      cmd: ['gcloud', 'auth', 'print-access-token'],
      stdin: 'null',
      errorPrefix: /ERROR:/,
    });
    return {
      access_token: (await proc.captureAllTextOutput()).trimEnd(),
      expires_in: 3600, // gcloud's default
      token_type: 'Bearer',
    };
  } catch (thrown) {
    const err = thrown as Error;
    reasons.push(`  - gcloud CLI: ${err.message}`);
  }

  throw new Error(reasons.join('\n'));
}

/**
 * Attempts to get a GCP auth token from two possible sources:
 * 1. A service account token from the GCP Metadata Server.
 * 2. A user token from the installed `gcloud` CLI.
 * If neither source is available, throws an Error.
 */
export async function fetchGoogleCloudToken(): Promise<string> {
  const auth = await fetchGoogleCloudAuth();
  return auth.access_token;
}

type ServiceAccountCredential = {
  accessToken: string;
  expireTime: string;
}

/**
 * Gets a google token from the running system,
 * then uses it to request an impersonation token for the given service account.
 */
export async function assumeServiceAccount({saEmail, ...payload}: {
  saEmail: string;
  scope: string[];
  lifetime?: string;
}): Promise<ServiceAccountCredential> {
  const mainAccessToken = await fetchGoogleCloudToken();

  const resp = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        authorization: `Bearer ${mainAccessToken}`,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
    });

  if (!resp.ok) throw new Error(
    `GCP generateAccessToken returned HTTP ${resp.status}: ${await resp.text()}`);

  return await resp.json() as ServiceAccountCredential;
}
