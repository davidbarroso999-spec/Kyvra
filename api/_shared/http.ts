const allowedOrigins = new Set([
  'https://descubrakyvra.vercel.app',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
]);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  });
  const origin = request.headers.get('origin');
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return headers;
}

export function isCorsOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || isAllowedOrigin(origin);
}

export function jsonResponse(
  request: Request,
  payload: unknown,
  status = 200,
): Response {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(payload), { status, headers });
}

export function optionsResponse(request: Request): Response {
  if (!isCorsOriginAllowed(request)) {
    return jsonResponse(request, { error: 'Origin is not allowed' }, 403);
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
