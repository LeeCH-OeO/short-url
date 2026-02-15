import { customAlphabet } from "nanoid";

const ID_LENGTH = 8;
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_ID_RETRIES = 50;
const REDIRECT_CACHE_TTL_SECONDS = 3600;
const SHORTEN_LIMIT_PATH = "/api/short";
const nanoid = customAlphabet(ALPHABET, ID_LENGTH);

function createJsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...headers,
    },
  });
}

function createShortCode(length = ID_LENGTH) {
  return nanoid(length);
}

function getOrigin(request, env) {
  return env.APP_BASE_URL || new URL(request.url).origin;
}

async function shortenUrl(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return createJsonResponse(
      { error: "Request body must be valid JSON." },
      400,
    );
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) {
    return createJsonResponse({ error: "Field 'url' is required." }, 400);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return createJsonResponse({ error: "Invalid URL format." }, 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return createJsonResponse({ error: "Only HTTP(S) URLs are allowed." }, 400);
  }

  let id = "";
  let stored = false;
  for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt += 1) {
    try {
      id = createShortCode();
      await env.URLS_DB.prepare(
        "INSERT INTO urls (id, destination_url) VALUES (?, ?)",
      )
        .bind(id, parsed.toString())
        .run();
      stored = true;
      break;
    } catch (error) {
      if (!String(error?.message || "").includes("UNIQUE constraint failed")) {
        return createJsonResponse(
          { error: "Unable to store short URL. Please retry." },
          503,
        );
      }
    }
  }

  if (!stored) {
    return createJsonResponse(
      { error: "Unable to allocate a unique short URL. Please retry." },
      503,
    );
  }

  const baseUrl = getOrigin(request, env);

  return createJsonResponse(
    {
      id,
      shortUrl: `${baseUrl}/${id}`,
    },
    201,
  );
}

function getClientIdentifier(request) {
  const accessUser = request.headers.get("cf-access-authenticated-user-email");
  if (accessUser) {
    return `user:${accessUser}`;
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

async function enforceShortenRateLimit(request, env) {
  if (!env.SHORTEN_RATE_LIMITER) {
    return null;
  }

  const key = `${getClientIdentifier(request)}:${SHORTEN_LIMIT_PATH}`;
  const result = await env.SHORTEN_RATE_LIMITER.limit({ key });
  if (result.success) {
    return null;
  }

  return createJsonResponse(
    { error: "Rate limit exceeded. Please retry in a minute." },
    429,
  );
}

function requireAccessForShorten(request) {
  const accessJwt = request.headers.get("cf-access-jwt-assertion");
  const accessUser = request.headers.get("cf-access-authenticated-user-email");
  if (accessJwt || accessUser) {
    return null;
  }

  return createJsonResponse(
    { error: "Authentication required to create short URLs." },
    401,
  );
}

function buildCacheKey(request) {
  return new Request(request.url, { method: "GET" });
}

function buildRedirectResponse(destination) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination,
      "Cache-Control": `public, max-age=${REDIRECT_CACHE_TTL_SECONDS}`,
    },
  });
}

function isShortCodePath(key) {
  return new RegExp(`^[A-Za-z0-9]{${ID_LENGTH}}$`).test(key);
}

async function redirectByCode(shortCode, request, env, ctx) {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await env.URLS_DB.prepare(
    "SELECT destination_url FROM urls WHERE id = ? LIMIT 1",
  )
    .bind(shortCode)
    .first();

  if (!row || typeof row.destination_url !== "string") {
    return new Response("Short URL not found", { status: 404 });
  }

  const destination = row.destination_url.trim();
  if (!destination) {
    return new Response("Short URL is invalid", { status: 500 });
  }

  const redirectResponse = buildRedirectResponse(destination);
  ctx.waitUntil(cache.put(cacheKey, redirectResponse.clone()));
  return redirectResponse;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return createJsonResponse({}, 204);
    }

    if (url.pathname === "/api/short" && request.method === "POST") {
      const accessResponse = requireAccessForShorten(request);
      if (accessResponse) {
        return accessResponse;
      }

      const rateLimitResponse = await enforceShortenRateLimit(request, env);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      return shortenUrl(request, env);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return createJsonResponse({ ok: true });
    }

    if (request.method === "GET") {
      const key = url.pathname.replace(/^\/+/, "");
      if (key && !key.startsWith("api/") && isShortCodePath(key)) {
        const redirect = await redirectByCode(key, request, env, ctx);
        if (redirect.status === 404) {
          return Response.redirect(`${url.origin}/create`, 302);
        }

        if (redirect.status !== 404) {
          return redirect;
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};
