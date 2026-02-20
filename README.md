# Short URL

React + Vite frontend with a Cloudflare Worker backend and D1 as the URL storage layer.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Cloudflare Workers (`worker/index.js`)
- Storage: Cloudflare D1 (`URLS_DB` binding)

## Local development

1. Install dependencies:

```bash
npm install
```

2. Run frontend locally:

```bash
npm run dev
```

3. Build frontend assets for Worker static serving:

```bash
npm run build
```

4. Run Cloudflare Worker locally (after `wrangler login`):

```bash
npm run cf:dev
```

## Environment variables

For local API routing, set in `.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

If omitted, frontend uses same-origin `/api/*`.

## Cloudflare setup

1. Create a D1 database:

```bash
wrangler d1 create short-url-db
```

2. Update `wrangler.toml` values:

- `name`
- `database_name`
- `database_id`
- `APP_BASE_URL`

3. Apply D1 migration (local + remote):

```bash
wrangler d1 migrations apply short-url-db --local
wrangler d1 migrations apply short-url-db --remote
```

4. Build and deploy:

```bash
npm run build
npm run cf:deploy
```

## API

### `POST /api/short`

Request:

```json
{ "url": "https://example.com/page" }
```

Response:

```json
{
  "id": "a1B2c3D",
  "shortUrl": "https://your-domain/a1B2c3D"
}
```

### `GET /api/urls`

Returns only URLs created by the currently authenticated user.

Response:

```json
{
  "items": [
    {
      "id": "a1B2c3D",
      "shortUrl": "https://your-domain/a1B2c3D",
      "destinationUrl": "https://example.com/page",
      "createdAt": "2026-02-20T04:21:23.000Z",
      "clickCount": 12,
      "lastClickedAt": "2026-02-20T04:45:10.000Z",
      "topCountry": "US",
      "lastGeo": {
        "country": "US",
        "region": "California",
        "city": "San Francisco"
      }
    }
  ]
}
```

### `GET /:id`

Redirects to the original URL stored in D1.

## Security

### Rate limiting

The Worker enforces rate limiting on `POST /api/short` using Cloudflare Rate Limiting binding:

- Binding: `SHORTEN_RATE_LIMITER`
- Limit: `20` requests per `60` seconds per user/IP

### Cloudflare One (Access) sign-in required

The Worker requires Cloudflare Access authentication for management APIs:

- `POST /api/short`
- `GET /api/urls`

Required Cloudflare dashboard setup:

1. Go to Zero Trust -> Access -> Applications.
2. Create a Self-hosted application for `st.ch-lee.xyz`.
3. Add an Access policy allowing your users/groups.

After this is enabled, requests include Access headers and the app/API will work only after sign-in.

## Access policy paths (recommended)

To keep short links public while protecting management:

- Protect: `st.ch-lee.xyz/create*`
- Protect: `st.ch-lee.xyz/api/short*`
- Protect: `st.ch-lee.xyz/api/urls*`
- Do not protect: `st.ch-lee.xyz/*` globally

This allows anyone to open `https://st.ch-lee.xyz/<id>` while only authenticated users can access creation and their own URL list.
