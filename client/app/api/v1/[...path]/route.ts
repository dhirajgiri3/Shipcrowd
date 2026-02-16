/**
 * API Proxy Route
 *
 * Proxies all /api/v1/* requests to the Express backend server.
 * This allows the Next.js frontend to serve the Shopify embedded app
 * while forwarding API calls to the backend on localhost:5005.
 *
 * Handles: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
 * Forwards: All headers (except hop-by-hop), query params, body
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5005';
const PROXY_TIMEOUT_MS = Number(process.env.API_PROXY_TIMEOUT_MS || 15000);

// Headers to exclude from forwarding (hop-by-hop headers)
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host', // Let fetch set this
];

// Headers that should not be forwarded after response-body transformation
const RESPONSE_EXCLUDED_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'content-encoding',
  'content-length',
  'set-cookie',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, path: string[]) {
  let timedOut = false;
  const startedAt = Date.now();
  try {
    const url = new URL(request.url);
    const backendPath = `/api/v1/${path.join('/')}`;
    const backendUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    // Forward all request headers (except hop-by-hop)
    const forwardHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.includes(lowerKey)) {
        forwardHeaders[key] = value;
      }
    });

    // Add forwarded headers for proper origin tracking
    forwardHeaders['x-forwarded-proto'] = url.protocol.replace(':', '');
    forwardHeaders['x-forwarded-host'] = url.host;
    const forwardedForHeader = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    forwardHeaders['x-forwarded-for'] =
      forwardedForHeader?.split(',')[0]?.trim() || realIp || 'unknown';

    const hasRequestBody =
      request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS';

    // Forward the request to the backend with bounded latency to avoid request pileups.
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PROXY_TIMEOUT_MS);
    let backendResponse: Response;
    try {
      const fetchOptions: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'manual', // Don't auto-follow redirects, let client handle
        signal: controller.signal,
      };

      // Stream request body to backend to avoid buffering large payloads in memory.
      if (hasRequestBody && request.body) {
        fetchOptions.body = request.body;
        fetchOptions.duplex = 'half';
      }

      backendResponse = await fetch(backendUrl, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }

    const status = backendResponse.status;
    const noBodyStatus = status === 204 || status === 205 || status === 304;
    const noBodyMethod = request.method === 'HEAD';

    // Get response body only when HTTP semantics allow it
    let data: string | null = null;
    if (!noBodyStatus && !noBodyMethod) {
      try {
        data = await backendResponse.text();
      } catch {
        data = '';
      }
    }

    // Create response with same status and headers.
    // 204/205/304 and HEAD responses cannot include a body.
    const response = noBodyStatus || noBodyMethod
      ? new NextResponse(null, {
          status,
          statusText: backendResponse.statusText,
        })
      : new NextResponse(data, {
          status,
          statusText: backendResponse.statusText,
        });

    // Copy all response headers (except hop-by-hop).
    // `Set-Cookie` must be handled separately because multiple cookies
    // are sent as distinct headers and must not be collapsed/overwritten.
    backendResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!RESPONSE_EXCLUDED_HEADERS.has(lowerKey)) {
        response.headers.set(key, value);
      }
    });

    // Forward all Set-Cookie headers individually (access + refresh, etc.)
    const hasGetSetCookie = typeof (backendResponse.headers as any).getSetCookie === 'function';
    const setCookies = hasGetSetCookie ? (backendResponse.headers as any).getSetCookie() : [];
    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        response.headers.append('set-cookie', cookie);
      }
    } else {
      const fallbackSetCookie = backendResponse.headers.get('set-cookie');
      if (fallbackSetCookie) {
        response.headers.append('set-cookie', fallbackSetCookie);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API Proxy] ${request.method} ${backendPath} -> ${status} in ${Date.now() - startedAt}ms`
      );
    }

    return response;
  } catch (error) {
    console.error('[API Proxy Error]', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: timedOut ? 'Backend timeout' : 'Request aborted',
          message: timedOut
            ? `Backend did not respond within ${PROXY_TIMEOUT_MS}ms`
            : 'Proxy request was aborted before completion',
        },
        { status: timedOut ? 504 : 503 }
      );
    }

    const maybeCode = (error as any)?.cause?.code || (error as any)?.code;
    if (maybeCode === 'ECONNREFUSED' || maybeCode === 'UND_ERR_SOCKET' || maybeCode === 'ECONNRESET') {
      return NextResponse.json(
        {
          error: 'Backend unavailable',
          message: 'Backend connection failed',
          code: maybeCode,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to proxy request to backend',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
