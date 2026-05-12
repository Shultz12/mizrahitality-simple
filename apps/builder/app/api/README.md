# Builder REST API

The **only** channel between the Builder app (this app, `:5111`) and the Customer app (`:5112`).
No authentication — a venue's **slug** identifies it (the slug is derived from the venue name at
site creation and is frozen). All responses are a JSON envelope from `@mizrahitality/contracts`:

- success → `ApiSuccess<T>` = `{ "ok": true, "data": <T> }`
- failure → `ApiError` = `{ "ok": false, "error": { "code": <string>, "message": <string> } }`

The body is always an envelope, including on `404` / `500` — `createApiClient` parses the body and
branches on `ok`, not on the HTTP status.

### Endpoints

- `GET /api/sites/{slug}` — a venue's published landing page (read by the Customer app, server-side).
- `POST /api/events` — record one analytics event from the Customer site (called from the visitor's
  browser — CORS-friendly).
- `GET /api/sites/{slug}/analytics` — aggregated lifetime analytics for a venue (read by the owner
  dashboard, server-side).

## `GET /api/sites/{slug}`

Fetch a venue's published landing page.

- **Path param** `slug` — the venue's slug. Case-insensitive (lower-cased server-side).
- **Type** `ApiResult<PublishedPage>` — `PublishedPage` / `PublishedBlock` and the path helper
  `publishedPagePath(slug)` are exported from `@mizrahitality/contracts` (envelope helpers `apiOk` /
  `apiErr`, types `ApiSuccess<T>` / `ApiError`, in the same package).

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| `200` | `{ "ok": true, "data": { "slug": string, "name": string, "blocks": PublishedBlock[] } }` | The published page. `name` is the pinned venue-name header; `blocks` are in render order. |
| `200` | `{ "ok": false, "error": { "code": "unpublished", "message": "…" } }` | The slug exists but has never been published — the request was understood, there's just no live content yet. Consumers show their "coming soon" placeholder. |
| `404` | `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` | No site with that slug. |
| `500` | `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }` | Unexpected failure. |

Editing + Saving a page (without Publishing) does **not** change what this endpoint serves — it
keeps the previously-published snapshot until the owner clicks **Publish** again.

### `PublishedBlock`

```ts
type PublishedBlock =
  | { id: string; type: "rich-text"; html: string }       // sanitized HTML
  | { id: string; type: "image"; imageUrl: string; alt: string }
  | { id: string; type: "book-now" };                     // presence only — no payload
```

`imageUrl` is a path **relative to this app's origin** — `/uploads/<file>` (an owner upload, served
by `GET /uploads/<file>`) or `/stock/<name>.svg` (a bundled stock image). Resolve it against
`BUILDER_API_URL` before rendering; the Builder never emits its own external origin.

### Example

```
$ curl http://localhost:5111/api/sites/cafemizrahi
{"ok":true,"data":{"slug":"cafemizrahi","name":"Cafe Mizrahi","blocks":[
  {"id":"…","type":"rich-text","html":"<p><strong>Open daily</strong></p>"},
  {"id":"…","type":"image","imageUrl":"/uploads/3f2…​.jpg","alt":"Our patio"},
  {"id":"…","type":"book-now"}
]}}
```

## `POST /api/events`

Record one analytics event from the Customer site. **No authentication.** Called from the visitor's
**browser** on the published page (`:5112` → `:5111`) — a cross-origin request: the endpoint sets
`Access-Control-Allow-Origin: *` (plus `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`)
on every response and answers the `OPTIONS` preflight. **No server-side de-duplication** — every
accepted `POST` stores one row; the Customer app emits exactly one `visit` per page load (REQ-15).

- **Request body** `AnalyticsEventInput` = `{ "slug": string, "type": "visit" | "book-now-hover" | "book-now-click" }`.
  `slug` is trimmed + lower-cased server-side; `type` is validated against `ANALYTICS_EVENT_TYPES`.
  Path helper `analyticsEventsPath()`; type `ApiResult<{ recorded: true }>` — all from `@mizrahitality/contracts`.

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| `200` | `{ "ok": true, "data": { "recorded": true } }` | Stored one row. |
| `400` | `{ "ok": false, "error": { "code": "invalid_event", "message": "…" } }` | Body not valid JSON, `slug` missing/empty, or `type` not one of the three — nothing stored. |
| `404` | `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` | No site with that slug — nothing stored. (An existing-but-**unpublished** slug *is* accepted — the placeholder "coming soon" page still emits a `visit`.) |
| `500` | `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }` | Unexpected failure. |

`OPTIONS /api/events` → `204` with the CORS headers (the browser preflight).

### Example

```
$ curl -X POST http://localhost:5111/api/events -H 'content-type: application/json' -d '{"slug":"cafemizrahi","type":"visit"}'
{"ok":true,"data":{"recorded":true}}
```

## `GET /api/sites/{slug}/analytics`

Aggregated analytics for a venue. **No authentication.** Read server-side by the owner dashboard
(feature 7) — same origin, so no CORS headers.

- **Path param** `slug` — case-insensitive (lower-cased server-side).
- **Type** `ApiResult<AnalyticsSummary>` — `AnalyticsSummary` and the path helper `analyticsSummaryPath(slug)`
  are exported from `@mizrahitality/contracts`.

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| `200` | `{ "ok": true, "data": { "slug": string, "visits": number, "bookNowHovers": number, "bookNowClicks": number } }` | Lifetime counts over all stored events for the slug (no time window). A slug with no events yet → all zeros. |
| `404` | `{ "ok": false, "error": { "code": "not_found", "message": "…" } }` | No site with that slug. |
| `500` | `{ "ok": false, "error": { "code": "internal_error", "message": "…" } }` | Unexpected failure. |

### Example

```
$ curl http://localhost:5111/api/sites/cafemizrahi/analytics
{"ok":true,"data":{"slug":"cafemizrahi","visits":3,"bookNowHovers":1,"bookNowClicks":0}}
```

---

Feature 7 surfaces this aggregation on the owner dashboard; feature 8 (the Customer app) is what
posts the events.
