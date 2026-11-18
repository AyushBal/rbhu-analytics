# Environment variable guide

## Backend (`backend/.env`, template: `.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | – | PostgreSQL connection string. In Azure: `…?sslmode=require`, stored in Key Vault |
| `JWT_SECRET` | yes (≥16 chars) | – | Signs mock-mode tokens. Use a random 48+ char value |
| `JWT_EXPIRES_IN` | no | `8h` | Token lifetime |
| `AUTH_MODE` | no | `mock` | `mock` (local JWT) or `entra` (validate Entra ID tokens) |
| `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE` | when `entra` | – | Tenant and API App ID URI/client ID |
| `PORT` | no | `4000` | HTTP port |
| `NODE_ENV` | no | `development` | `production` hides internal error messages |
| `LOG_LEVEL` | no | `info` | pino level |
| `CORS_ORIGINS` | no | `http://localhost:5173` | Comma-separated browser origin allow-list |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | one provider | `gpt-4o-mini` | OpenAI |
| `AZURE_OPENAI_ENDPOINT`, `_API_KEY`, `_DEPLOYMENT`, `_API_VERSION` | one provider | `2024-06-01` | Azure OpenAI (takes precedence) |
| `ANALYTICS_URL` | no | `http://localhost:5001` | Flask service base URL |
| `REDIS_URL` | no | empty | Enables cross-instance WebSocket fan-out |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | no | `admin@rbhu.in` / `Admin@12345` | Used only by `npm run seed` |

The app validates all variables at boot (Zod) and exits with a readable message if anything is wrong.

## Analytics (`analytics/.env`)
`PORT` (5001), `CORS_ORIGINS`.

## Frontend (`frontend/.env`)
`VITE_API_URL` – leave empty for same-origin `/api` + `/ws` (Vite proxy in dev, nginx/Front Door in prod). Never put secrets in `VITE_*`: they ship to the browser.

## Secret handling rules
- `.env` is git-ignored; only `.env.example` is committed.
- Logs redact `authorization`, `cookie`, `password*`, `token`.
- In Azure, secrets come from Key Vault references, never from the repo or pipeline variables.
