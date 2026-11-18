# 10–15 minute walkthrough script

| Time | Show | Say |
|---|---|---|
| 0:00 | README + architecture diagram | Three services (API, Flask analytics, React SPA), PostgreSQL, Redis; Azure target design. |
| 1:30 | `docker compose up`, then Swagger at `/docs` | Layering: routes → Zod → controller → service → repository. Consistent error shape. |
| 3:00 | Login → Dashboard | Mock JWT auth, same verifier used for Entra mode. Totals + status distribution + SharePoint announcements. |
| 4:00 | Customers: search, add (try a duplicate email), edit, delete | Form validation on both sides; soft delete + audit fields; partial unique index so emails can be reused. |
| 5:30 | Shipments: create, then change status in **two browser windows** | Lifecycle rules (try an invalid jump); WebSocket event → toast + auto-refresh in the other window. Redis fan-out for multiple instances. |
| 7:30 | Analytics: upload `analytics/sample_sales.csv`, then a bad CSV | Pandas validation, Plotly charts, PNG export via Kaleido. |
| 9:00 | Assistant: "status summary", "where is RBHU-DEMO1001?", a follow-up question | Context retrieval, prompt rules, history, provider fallback and graceful error. |
| 10:30 | `docs/DEPLOYMENT.md` diagram | App Service + VNet integration, private endpoints, Key Vault with managed identity, Entra ID, slots + OIDC pipeline. |
| 12:00 | `docs/TRADEOFFS.md` | Trade-offs, scaling path (Web PubSub, queue for analytics), security, next steps. |
| 13:30 | Bonuses | Fabric mirroring + lakehouse; voice agent flow with ACS + Voice Live; Graph + `Sites.Selected` for SharePoint. |
