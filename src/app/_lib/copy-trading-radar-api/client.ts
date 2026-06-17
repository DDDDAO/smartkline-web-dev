import { SIGNAL_CENTER_PROXY_BASE_URL } from "./constants";

export async function requestSignalCenterJson<T>(path: string): Promise<T> {
  const response = await fetch(`${SIGNAL_CENTER_PROXY_BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await createRequestErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function createRequestErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Signal Center request failed: ${response.status} ${response.statusText}`;
  }

  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error || text;
  } catch {
    return text;
  }
}
