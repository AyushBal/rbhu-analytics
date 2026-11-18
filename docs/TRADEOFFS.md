# Design trade-offs, scalability and future work

## Decisions and why

| Decision | Why | Trade-off |
|---|---|---|
| Layered service/repository pattern | Business rules testable without HTTP/DB; soft-delete filter in one place | More files than a flat Express app |
| Prisma + hand-written partial unique index | Typed queries and migrations, but uniqueness that respects soft delete | Migration SQL has a part Prisma doesn't model; don't regenerate it blindly |
| Zod for env, requests and forms | One validation language across backend and frontend | Schemas are duplicated in the frontend rather than shared via a package (monorepo package is a next step) |
| Shipment lifecycle state machine | Prevents nonsense (Delivered → Pending) and keeps history trustworthy | Corrections need an explicit admin path (not implemented) |
| `ShipmentEvent` history table | Audit trail + notification source + analytics feed | Slightly more write cost per update |
| Flask as a separate service | Matches the brief and isolates CPU-heavy Pandas/Kaleido work | Extra network hop; API proxies uploads to keep auth in one place |
| Plotly JSON rendered client-side + optional PNG | Interactive charts and no server rendering by default | Kaleido is slow (~1–3 s) so PNG is opt-in per request |
| Retrieval-lite for the AI assistant | Grounds answers in live data without a vector DB | Only covers totals and tracking-number lookups; no semantic search |
| Chat history in PostgreSQL | Survives restarts, works across instances | Needs a retention policy and per-user scoping in production |
| WebSocket broadcast to all clients | What the brief asks | Per-customer/role channels would be better for multi-tenant use |
| JWT mock auth + Entra-ready middleware | Works offline for review, one config flag for Entra | Frontend still uses the mock login form |

## Scalability approach
- **Stateless API**: all state in PostgreSQL/Redis, so scale out with App Service instances behind the load balancer.
- **WebSockets**: Redis pub/sub fan-out (already implemented behind `REDIS_URL`); heartbeat prunes dead sockets. Beyond roughly tens of thousands of connections, move to Azure Web PubSub or SignalR Service to offload connection handling.
- **Database**: pagination everywhere, indexes on filter columns, connection pooling (PgBouncer built into Flexible Server), read replica for reporting.
- **Analytics**: CPU-bound; scale independently, or push large files to Blob Storage + a queue and process asynchronously.
- **AI**: bounded history (20 messages), 20 s timeout, one retry, per-user rate limit; add a queue/streaming (SSE) for long answers.

## Security summary
Zod validation, Helmet, strict CORS allow-list, rate limits on login/chat, bcrypt hashing with a timing-safe dummy compare, JWT expiry, redacted logs, no raw SQL, upload size/type limits, secrets only from env/Key Vault.

## Future enhancements
1. MSAL login in the SPA and role-based UI/route guards.
2. Per-user chat sessions; streaming responses; tool-calling for the assistant instead of regex retrieval.
3. Outbox pattern for notifications (guaranteed delivery) and per-customer subscriptions.
4. Integration tests with Testcontainers PostgreSQL; Playwright end-to-end tests.
5. OpenTelemetry tracing end to end (browser → API → Flask).
6. Shared `@rbhu/contracts` package (Zod schemas + generated OpenAPI) used by both ends.
7. Bicep modules for the full Azure estate.
