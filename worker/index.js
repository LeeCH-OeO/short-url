import { Hono } from "hono";
import { customAlphabet } from "nanoid";

const ID_LENGTH = 8;
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_ID_RETRIES = 50;
const REDIRECT_CACHE_TTL_SECONDS = 3600;
const SHORTEN_LIMIT_PATH = "/api/short";
const LIST_URL_LIMIT = 100;
const EMPTY_ANALYTICS = {
  clickCount: 0,
  lastClickedAt: null,
  topCountry: null,
  lastGeo: null,
};
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

function getOrigin(request, env) {
  return env.APP_BASE_URL || new URL(request.url).origin;
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDateFromUnixSeconds(value) {
  const unixSeconds = parseNumber(value);
  if (unixSeconds === null) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}

function getGeoFromRequest(request) {
  const cf = request.cf || {};

  return {
    country: normalizeString(cf.country),
    region: normalizeString(cf.region),
    city: normalizeString(cf.city),
  };
}

async function recordClickEvent(shortCode, request, env) {
  const geo = getGeoFromRequest(request);

  try {
    await env.URLS_DB.prepare(
      "INSERT INTO click_events (short_id, country, region, city) VALUES (?, ?, ?, ?)",
    )
      .bind(shortCode, geo.country, geo.region, geo.city)
      .run();
  } catch {
    // Keep redirects fast and available even if analytics storage fails.
  }
}

async function getUrlAnalytics(env, shortIds) {
  const analyticsByShortId = new Map();
  if (!Array.isArray(shortIds) || shortIds.length === 0) {
    return analyticsByShortId;
  }

  const placeholders = shortIds.map(() => "?").join(", ");

  try {
    const [countsResult, countryResult, lastGeoResult] = await Promise.all([
      env.URLS_DB.prepare(
        `SELECT short_id, COUNT(*) AS click_count, MAX(created_at) AS last_clicked_at
         FROM click_events
         WHERE short_id IN (${placeholders})
         GROUP BY short_id`,
      )
        .bind(...shortIds)
        .all(),
      env.URLS_DB.prepare(
        `SELECT short_id, country, COUNT(*) AS country_count
         FROM click_events
         WHERE short_id IN (${placeholders}) AND country IS NOT NULL AND country != ''
         GROUP BY short_id, country
         ORDER BY short_id ASC, country_count DESC, country ASC`,
      )
        .bind(...shortIds)
        .all(),
      env.URLS_DB.prepare(
        `SELECT e.short_id, e.country, e.region, e.city, e.created_at, e.id
         FROM click_events e
         JOIN (
           SELECT short_id, MAX(created_at) AS max_created_at
           FROM click_events
           WHERE short_id IN (${placeholders})
           GROUP BY short_id
         ) latest
           ON latest.short_id = e.short_id AND latest.max_created_at = e.created_at
         WHERE e.short_id IN (${placeholders})
         ORDER BY e.short_id ASC, e.id DESC`,
      )
        .bind(...shortIds, ...shortIds)
        .all(),
    ]);

    const countRows = Array.isArray(countsResult?.results)
      ? countsResult.results
      : [];
    for (const row of countRows) {
      const shortId = normalizeString(row.short_id);
      if (!shortId) {
        continue;
      }

      const clickCount = parseNumber(row.click_count) ?? 0;
      const lastClickedAt = toIsoDateFromUnixSeconds(row.last_clicked_at);
      analyticsByShortId.set(shortId, {
        clickCount,
        lastClickedAt,
        topCountry: null,
        lastGeo: null,
      });
    }

    const countryRows = Array.isArray(countryResult?.results)
      ? countryResult.results
      : [];
    for (const row of countryRows) {
      const shortId = normalizeString(row.short_id);
      if (!shortId) {
        continue;
      }

      const existing = analyticsByShortId.get(shortId) || { ...EMPTY_ANALYTICS };
      if (!existing.topCountry) {
        existing.topCountry = normalizeString(row.country);
      }
      analyticsByShortId.set(shortId, existing);
    }

    const lastGeoRows = Array.isArray(lastGeoResult?.results)
      ? lastGeoResult.results
      : [];
    for (const row of lastGeoRows) {
      const shortId = normalizeString(row.short_id);
      if (!shortId) {
        continue;
      }

      const existing = analyticsByShortId.get(shortId) || { ...EMPTY_ANALYTICS };
      if (existing.lastGeo) {
        continue;
      }

      const country = normalizeString(row.country);
      const region = normalizeString(row.region);
      const city = normalizeString(row.city);
      const hasGeo = country || region || city;
      existing.lastGeo = hasGeo
        ? {
            country,
            region,
            city,
          }
        : null;
      analyticsByShortId.set(shortId, existing);
    }

    return analyticsByShortId;
  } catch {
    return analyticsByShortId;
  }
}

async function shortenUrl(request, env, ownerId) {
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
      id = nanoid();
      await env.URLS_DB.batch([
        env.URLS_DB.prepare(
          "INSERT INTO urls (id, destination_url) VALUES (?, ?)",
        ).bind(id, parsed.toString()),
        env.URLS_DB.prepare(
          "INSERT INTO user_urls (owner_id, short_id) VALUES (?, ?)",
        ).bind(ownerId, id),
      ]);
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

function getAuthenticatedUserId(request) {
  const accessUser = request.headers.get("cf-access-authenticated-user-email");
  if (!accessUser) {
    return "";
  }

  return accessUser.trim().toLowerCase();
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

function requireAuthenticatedUser(request) {
  const userId = getAuthenticatedUserId(request);
  if (userId) {
    return null;
  }

  return createJsonResponse(
    { error: "Authentication required. Sign in through Cloudflare Access." },
    401,
  );
}

async function listUserUrls(request, env, ownerId) {
  const queryResult = await env.URLS_DB.prepare(
    `SELECT u.id, u.destination_url, m.created_at
     FROM user_urls m
     JOIN urls u ON u.id = m.short_id
     WHERE m.owner_id = ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
  )
    .bind(ownerId, LIST_URL_LIMIT)
    .all();

  const rows = Array.isArray(queryResult?.results) ? queryResult.results : [];
  const shortIds = rows
    .map((row) => normalizeString(row.id))
    .filter((shortId) => !!shortId);
  const analyticsByShortId = await getUrlAnalytics(env, shortIds);

  const baseUrl = getOrigin(request, env);
  const items = rows
    .map((row) => {
      const id = normalizeString(row.id);
      const destinationUrl = normalizeString(row.destination_url);
      if (!id || !destinationUrl) {
        return null;
      }

      const createdAt = toIsoDateFromUnixSeconds(row.created_at);
      const analytics = analyticsByShortId.get(id) || { ...EMPTY_ANALYTICS };

      return {
        id,
        destinationUrl,
        shortUrl: `${baseUrl}/${id}`,
        createdAt,
        clickCount: analytics.clickCount,
        lastClickedAt: analytics.lastClickedAt,
        topCountry: analytics.topCountry,
        lastGeo: analytics.lastGeo,
      };
    })
    .filter(Boolean);

  return createJsonResponse({ items });
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

async function redirectByCode(shortCode, request, env, ctx) {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    ctx.waitUntil(recordClickEvent(shortCode, request, env));
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
  ctx.waitUntil(recordClickEvent(shortCode, request, env));
  return redirectResponse;
}

const app = new Hono();

app.options("*", (c) => createJsonResponse({}, 204));

app.post("/api/short", async (c) => {
  const request = c.req.raw;
  const env = c.env;

  const accessResponse = requireAuthenticatedUser(request);
  if (accessResponse) {
    return accessResponse;
  }

  const rateLimitResponse = await enforceShortenRateLimit(request, env);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const ownerId = getAuthenticatedUserId(request);
  return shortenUrl(request, env, ownerId);
});

app.get("/api/urls", async (c) => {
  const request = c.req.raw;
  const env = c.env;

  const accessResponse = requireAuthenticatedUser(request);
  if (accessResponse) {
    return accessResponse;
  }

  const ownerId = getAuthenticatedUserId(request);
  return listUserUrls(request, env, ownerId);
});

app.get("/api/health", () => createJsonResponse({ ok: true }));

app.get(`/:key{[A-Za-z0-9]{${ID_LENGTH}}}`, async (c) => {
  const key = c.req.param("key");
  const redirect = await redirectByCode(key, c.req.raw, c.env, c.executionCtx);

  if (redirect.status === 404) {
    const url = new URL(c.req.url);
    return Response.redirect(`${url.origin}/create`, 302);
  }

  return redirect;
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
