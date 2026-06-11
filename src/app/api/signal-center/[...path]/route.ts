const DEFAULT_SIGNAL_CENTER_API_BASE_URL = "https://api.smartkline.com/signal-center";
const SIGNAL_CENTER_API_BASE_URL = process.env.SIGNAL_CENTER_API_BASE_URL ?? DEFAULT_SIGNAL_CENTER_API_BASE_URL;
const SIGNAL_CENTER_API_TOKEN = process.env.SIGNAL_CENTER_API_TOKEN?.trim();

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
  if (isProtectedSignalCenterPath(path) && !SIGNAL_CENTER_API_TOKEN) {
    return Response.json(
      { error: "SIGNAL_CENTER_API_TOKEN is not configured on the Next.js server." },
      { status: 503 },
    );
  }
  if (SIGNAL_CENTER_API_TOKEN) {
    headers.set("x-token", SIGNAL_CENTER_API_TOKEN);
  }

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
      headers,
      method: request.method,
    });
    return createSignalCenterProxyResponse(response, path, request.url);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

function isProtectedSignalCenterPath(pathSegments: readonly string[]): boolean {
  return pathSegments[0] === "v1";
}

function createSignalCenterTargetUrl(pathSegments: readonly string[], requestUrl: string): string {
  const baseUrl = SIGNAL_CENTER_API_BASE_URL.endsWith("/") ? SIGNAL_CENTER_API_BASE_URL : `${SIGNAL_CENTER_API_BASE_URL}/`;
  const targetUrl = new URL(pathSegments.map(encodeURIComponent).join("/"), baseUrl);
  const incomingUrl = new URL(requestUrl);
  targetUrl.search = incomingUrl.search;
  return targetUrl.toString();
}

async function createSignalCenterProxyResponse(
  response: Response,
  pathSegments: readonly string[],
  requestUrl: string,
): Promise<Response> {
  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  if (shouldFilterSkippedTrades(pathSegments, requestUrl, contentType)) {
    const responseText = await response.text();
    try {
      return Response.json(filterSkippedTradesPayload(JSON.parse(responseText) as unknown), {
        status: response.status,
        statusText: response.statusText,
      });
    } catch {
      return new Response(responseText, {
        headers: responseHeaders,
        status: response.status,
        statusText: response.statusText,
      });
    }
  }

  return new Response(await response.arrayBuffer(), {
    headers: responseHeaders,
    status: response.status,
    statusText: response.statusText,
  });
}

function shouldFilterSkippedTrades(
  pathSegments: readonly string[],
  requestUrl: string,
  contentType: string | null,
): boolean {
  if (!contentType?.includes("application/json")) {
    return false;
  }

  const incomingUrl = new URL(requestUrl);
  if (incomingUrl.searchParams.get("includeSkipped")?.trim().toLowerCase() === "true") {
    return false;
  }

  return isCopyTradingRadarPath(pathSegments) || isSignalSourceTradesPath(pathSegments);
}

function isCopyTradingRadarPath(pathSegments: readonly string[]): boolean {
  return pathSegments.length === 2 && pathSegments[0] === "v1" && pathSegments[1] === "copy-trading-radar";
}

function isSignalSourceTradesPath(pathSegments: readonly string[]): boolean {
  return pathSegments.length === 4
    && pathSegments[0] === "v1"
    && pathSegments[1] === "signal-sources"
    && pathSegments[3] === "trades";
}

function filterSkippedTradesPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.trades)) {
    return {
      ...record,
      trades: record.trades.filter((trade) => !isSkippedTradePayload(trade)),
    };
  }

  if (Array.isArray(record.sources)) {
    return {
      ...record,
      sources: record.sources.map((source) => {
        if (!source || typeof source !== "object") {
          return source;
        }

        const sourceRecord = source as Record<string, unknown>;
        if (!Array.isArray(sourceRecord.trades)) {
          return sourceRecord;
        }

        return {
          ...sourceRecord,
          trades: sourceRecord.trades.filter((trade) => !isSkippedTradePayload(trade)),
        };
      }),
    };
  }

  return payload;
}

function isSkippedTradePayload(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const metadata = record.metadata && typeof record.metadata === "object"
    ? record.metadata as Record<string, unknown>
    : null;

  return isTruthyMetadataFlag(record.skipped)
    || isSkipStatus(record.status)
    || isSkipStatus(record.tradeStatus)
    || isSkipStatus(record.trade_status)
    || isTruthyMetadataFlag(metadata?.skipped)
    || isSkipStatus(metadata?.status)
    || isSkipStatus(metadata?.tradeStatus)
    || isSkipStatus(metadata?.trade_status);
}

function isTruthyMetadataFlag(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");
}

function isSkipStatus(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "skip";
}
