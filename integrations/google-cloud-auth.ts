import { SubProcess } from "../system/sub-process.ts";
import { fetchServiceAccountToken } from "./google-metadata-service.ts";

/**
 * Attempts to get a GCP auth token from two possible sources:
 * 1. A service account token from the GCP Metadata Server.
 * 2. A user token from the installed `gcloud` CLI.
 * If neither source is available, throws an Error.
 */
export async function fetchGoogleCloudToken(): Promise<string> {
  const reasons = [`No Google Cloud access token found. Encountered issues:`];

  try {
    const resp = await fetchServiceAccountToken();
    return resp.access_token;
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
      cmd: ['gcloud', 'auth', 'application-default', 'print-access-token'],
      stdin: 'null',
      errorPrefix: /ERROR:/,
    });
    return (await proc.captureAllTextOutput()).trimEnd();
  } catch (thrown) {
    const err = thrown as Error;
    reasons.push(`  - gcloud CLI: ${err.message}`);
  }

  throw new Error(reasons.join('\n'));
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
