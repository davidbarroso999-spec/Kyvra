import { isCorsOriginAllowed, jsonResponse, optionsResponse } from '../_shared/http';

export function OPTIONS(request: Request): Response {
  return optionsResponse(request);
}

export function GET(request: Request): Response {
  if (!isCorsOriginAllowed(request)) {
    return jsonResponse(request, { error: 'Origin is not allowed' }, 403);
  }
  return jsonResponse(request, {
    configured: Boolean(process.env.GEMINI_API_KEY),
  });
}
