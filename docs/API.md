# API reference

Base URL `/api`. Interactive docs: **`/docs`** (Swagger UI), raw spec: `/openapi.json`.
All routes except `POST /auth/login` and `GET /health` need `Authorization: Bearer <JWT>`.

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{email,password}` → `{token,user}`; rate limited (20 / 15 min) |
| GET | `/auth/me` | current user |
| GET | `/dashboard/stats` | totals + status distribution |
| GET | `/customers` | `page,pageSize,search,status`; excludes soft-deleted |
| POST | `/customers` | `{name,email,company,status?}` → 201 / 409 duplicate email |
| GET/PUT/DELETE | `/customers/:id` | PUT accepts partial fields; DELETE is a soft delete (204) |
| GET | `/shipments` | `page,pageSize,status,customerId,search` |
| POST | `/shipments` | `{customerId,origin,destination,trackingNumber?,status?}`; tracking number generated if omitted |
| GET | `/shipments/:id` | includes `events` (status history) |
| PATCH | `/shipments/:id/status` | `{status}`; enforces lifecycle; broadcasts WebSocket event |
| POST | `/chat` | `{sessionId?,message}` → `{sessionId,reply,provider}` |
| GET/DELETE | `/chat/:sessionId` | history / clear |
| POST | `/analytics/analyze?png=true` | multipart `file`; proxied to Flask |
| GET | `/announcements` | mocked SharePoint announcements |
| GET | `/health` | liveness |

Shipment lifecycle: `Pending → InTransit → OutForDelivery → Delivered`; `Cancelled` is allowed from any non-final state; `Delivered` and `Cancelled` are terminal.

## WebSocket

`ws://host/ws?token=<JWT>` → server pushes

```json
{ "event": "shipment_status_changed", "shipmentId": "…", "status": "Delivered",
  "trackingNumber": "RBHU-…", "previousStatus": "OutForDelivery", "timestamp": "2026-11-17T10:00:00.000Z" }
```

## Flask service (direct)

`POST /analyze` (multipart `file`, optional `?png=true`) · `POST /analyze/png` (ZIP of PNGs) · `GET /health`.
```bash
curl -F file=@analytics/sample_sales.csv "http://localhost:5001/analyze?png=true"
```
