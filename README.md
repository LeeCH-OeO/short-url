# Short URL

React + Vite frontend with a Cloudflare Worker backend and R2 as the URL storage layer.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Cloudflare Workers (`worker/index.js`)
- Storage: Cloudflare R2 (`URLS_BUCKET` binding)

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

1. Create an R2 bucket:

```bash
wrangler r2 bucket create short-url-db
```

2. Update `wrangler.toml` values:

- `name`
- `bucket_name`
- `APP_BASE_URL`

3. Build and deploy:

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

### `GET /:id`

Redirects to the original URL stored in R2.

## Security

### Rate limiting

The Worker enforces rate limiting on `POST /api/short` using Cloudflare Rate Limiting binding:

- Binding: `SHORTEN_RATE_LIMITER`
- Limit: `20` requests per `60` seconds per user/IP

### Cloudflare One (Access) sign-in required

The Worker now requires Cloudflare Access authentication for all routes except `GET /api/health`.

Required Cloudflare dashboard setup:

1. Go to Zero Trust -> Access -> Applications.
2. Create a Self-hosted application for `st.ch-lee.xyz`.
3. Add an Access policy allowing your users/groups.

After this is enabled, requests include Access headers and the app/API will work only after sign-in.

## Access policy paths (recommended)

To keep short links public while protecting creation:

- Protect: `st.ch-lee.xyz/create*`
- Protect: `st.ch-lee.xyz/api/short*`
- Do not protect: `st.ch-lee.xyz/*` globally

This allows anyone to open `https://st.ch-lee.xyz/<id>` while only authenticated users can access the create page and create API.
