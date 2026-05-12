# Builder REST API

The **only** channel between the Builder app (this app, `:5111`) and the Customer app (`:5112`).
No authentication — a venue's **slug** identifies it (the slug is derived from the venue name at
site creation and is frozen). All responses are a JSON envelope from `@mizrahitality/contracts`:

- success → `ApiSuccess<T>` = `{ "ok": true, "data": <T> }`
- failure → `ApiError` = `{ "ok": false, "error": { "code": <string>, "message": <string> } }`

The body is always an envelope, including on `404` / `500` — `createApiClient` parses the body and
branches on `ok`, not on the HTTP status.

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

## Coming later

- `POST /api/events` — analytics event ingest (visit / Book Now hover / Book Now click).
- A per-slug analytics aggregation endpoint (e.g. `GET /api/sites/{slug}/analytics`).

Both are added by feature 6 (`analytics-api`).
