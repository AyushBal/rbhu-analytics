# RBHU Dispatch – Full Stack Assessment

Customer & shipment management platform with sales analytics, an AI assistant, real-time notifications and an Azure deployment design.

| Module | Where | Stack |
|---|---|---|
| 1 Customer & Shipment API | `backend/` | Node 20, Express, TypeScript, Prisma, PostgreSQL, Zod, Swagger |
| 2 React frontend | `frontend/` | React 18, TypeScript, Vite, React Query, React Hook Form + Zod |
| 3 Sales analytics | `analytics/` | Python 3.10+, Flask, Pandas, Plotly, Kaleido |
| 4 AI assistant | `backend/src/services/aiService.ts` | Azure OpenAI / OpenAI (demo fallback with no key) |
| 5 Real-time notifications | `backend/src/ws/notificationHub.ts` | `ws`, optional Redis pub/sub |
| 6 Azure design | `docs/DEPLOYMENT.md` | App Service, PostgreSQL Flexible Server, Entra ID, Key Vault, VNet |
| Bonus 1–3 | `docs/FABRIC.md`, `docs/VOICE_AGENT.md`, `docs/SHAREPOINT.md` + `GET /api/announcements` | |

## Quick start (Docker)

```bash
docker compose up --build
# UI        http://localhost:8080      login: admin@rbhu.in / Admin@12345
# API docs  http://localhost:4000/docs
```
Seed demo data once the stack is up: `docker compose exec backend npx tsx prisma/seed.ts`
(or run `npm run seed` locally). Set `OPENAI_API_KEY` in your shell before `docker compose up` to use a real model.

## Quick start (local dev)

Prerequisites: Node 18.18+, Python 3.10+, PostgreSQL 14+ (or `docker compose up db redis`).

```bash
# 1. Backend
cd backend
cp .env.example .env            # edit DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy       # or: npm run prisma:migrate  (dev)
npm run seed                    # admin user + demo customers/shipments
npm run dev                     # http://localhost:4000  (docs at /docs)

# 2. Analytics service
cd analytics
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # http://localhost:5001

# 3. Frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api and /ws to :4000)
```

## Tests

```bash
cd backend   && npm test        # Zod schemas + shipment lifecycle rules
cd analytics && pytest -q       # CSV validation, stats, charts, PNG export
cd frontend  && npm run build   # type-check + production build
```

## Documentation

- [Architecture & data flow](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE.md)
- [API reference](docs/API.md) (live Swagger UI at `/docs`)
- [Environment variable guide](docs/ENVIRONMENT.md)
- [Azure deployment design](docs/DEPLOYMENT.md)
- [Design trade-offs & scaling notes](docs/TRADEOFFS.md)
- [Demo walkthrough script (10–15 min)](docs/DEMO_SCRIPT.md)
- Bonus: [Fabric](docs/FABRIC.md) · [Voice agent](docs/VOICE_AGENT.md) · [SharePoint](docs/SHAREPOINT.md)

## Project layout

```
backend/    src/{config,controllers,docs,lib,middleware,repositories,routes,schemas,services,ws,tests}
            prisma/{schema.prisma,migrations,seed.ts}
frontend/   src/{api,components,context,hooks,pages}
analytics/  app.py, test_app.py, sample_sales.csv
docs/       architecture, DB, API, env, Azure, bonuses
```

## Known limitations

- Entra ID mode (`AUTH_MODE=entra`) validates tokens on the API but the React app ships with the mock login form only (MSAL wiring is described in `docs/DEPLOYMENT.md`).
- Chat history is stored in PostgreSQL but isn't scoped per user; a production version should add `userId` to `ChatMessage`.
- Tokens are kept in `localStorage` for simplicity; production should prefer an Entra-backed MSAL session or httpOnly cookies.
