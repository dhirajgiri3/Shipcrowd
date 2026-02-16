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

    // Get request body if present
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const json = await request.json();
          body = JSON.stringify(json);
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          body = await request.text();
        } else {
          body = await request.text();
        }

        // Update content-length header to match actual body length
        if (body) {
          forwardHeaders['content-length'] = Buffer.byteLength(body, 'utf8').toString();
        } else {
          // Remove content-length if body is empty
          delete forwardHeaders['content-length'];
        }
      } catch (e) {
        // Body might be empty, that's ok
        body = undefined;
        delete forwardHeaders['content-length'];
      }
    } else {
      // No body for GET/HEAD/OPTIONS - remove content-length
      delete forwardHeaders['content-length'];
    }

    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual', // Don't auto-follow redirects, let client handle
    });

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
      if (
        !HOP_BY_HOP_HEADERS.includes(lowerKey) &&
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'set-cookie'
      ) {
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

    return response;
  } catch (error) {
    console.error('[API Proxy Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to proxy request to backend',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
