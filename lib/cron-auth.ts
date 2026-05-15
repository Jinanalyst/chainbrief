const AUTH_SCHEME = "Bearer";

export function getCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

export function createCronAuthorizationHeaders(): HeadersInit {
  const secret = getCronSecret();

  return secret ? { Authorization: `${AUTH_SCHEME} ${secret}` } : {};
}

export function isAuthorizedCronRequest(headers: Headers) {
  if (headers.has("x-vercel-cron")) {
    return true;
  }

  const expectedSecret = getCronSecret();
  if (!expectedSecret) {
    return false;
  }

  return getBearerToken(headers.get("authorization")) === expectedSecret;
}

function getBearerToken(authHeader: string | null) {
  if (!authHeader) {
    return "";
  }

  const [scheme, ...tokenParts] = authHeader.trim().split(/\s+/);
  if (scheme.toLowerCase() !== AUTH_SCHEME.toLowerCase()) {
    return "";
  }

  return tokenParts.join(" ").trim();
}
