const DEFAULT_SIGNAL_CENTER_API_BASE_URL = "https://api.smartkline.com/signal-center";
const SIGNAL_CENTER_API_BASE_URL = process.env.SIGNAL_CENTER_API_BASE_URL ?? DEFAULT_SIGNAL_CENTER_API_BASE_URL;
const SIGNAL_CENTER_API_TOKEN = process.env.SIGNAL_CENTER_API_TOKEN;

type SignalCenterRouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: Request, context: SignalCenterRouteContext) {
  return proxySignalCenterRequest(request, context);
}

async function proxySignalCenterRequest(request: Request, context: SignalCenterRouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  const targetUrl = createSignalCenterTargetUrl(path, request.url);
  const headers = new Headers({ Accept: "application/json" });

  /**
   * Signal Center protects source and position data with x-token. Keeping the
   * token in this route avoids shipping server credentials to the browser.
   */
  if (SIGNAL_CENTER_API_TOKEN) {
    headers.set("x-token", SIGNAL_CENTER_API_TOKEN);
  }

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
      headers,
      method: request.method,
    });
    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new Response(await response.arrayBuffer(), {
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

function createSignalCenterTargetUrl(pathSegments: readonly string[], requestUrl: string): string {
  const baseUrl = SIGNAL_CENTER_API_BASE_URL.endsWith("/") ? SIGNAL_CENTER_API_BASE_URL : `${SIGNAL_CENTER_API_BASE_URL}/`;
  const targetUrl = new URL(pathSegments.map(encodeURIComponent).join("/"), baseUrl);
  const incomingUrl = new URL(requestUrl);
  targetUrl.search = incomingUrl.search;
  return targetUrl.toString();
}
