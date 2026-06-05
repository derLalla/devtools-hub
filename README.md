# Developer Tools Landing Page

A small internal landing page that lists links to the tools developers use to
operate a SaaS product (Grafana, Sentry, Argo CD, …). Public visitors can
browse the link grid; an authenticated administrator can manage the entries.

The links and their metadata live in MongoDB, so non-developers can update the
list without touching code or redeploying.

## Architecture

```
┌────────────┐     HTTPS       ┌─────────────────────────────┐
│  Browser   │ ───────────────▶│  Node.js / Express          │
│ (Vue SPA)  │◀───── static ───│   ├── /              SPA    │
└────────────┘                 │   ├── /api/auth      login  │
                               │   └── /api/links     CRUD   │
                               └───────────────┬─────────────┘
                                               │ Mongoose
                                               ▼
                                        ┌────────────┐
                                        │  MongoDB   │
                                        └────────────┘
```

The frontend is built at image-build time and served as static assets by the
Node process. A single container exposes both the API and the SPA.

## Repository layout

```
.
├── server/             # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts        # entrypoint (config, DB, seed, HTTP)
│   │   ├── app.ts          # Express app factory
│   │   ├── config.ts       # zod-validated env config
│   │   ├── db.ts           # Mongo connection with retry
│   │   ├── logger.ts       # pino logger with secret redaction
│   │   ├── seed.ts         # initial admin user bootstrap
│   │   ├── models/         # Mongoose schemas (User, Link)
│   │   ├── routes/         # auth + links routers
│   │   ├── middleware/     # JWT auth guards
│   │   └── __tests__/      # vitest + supertest smoke tests
│   └── package.json
├── web/                # Vue 3 + Vite SPA
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue, router.ts, styles.css
│   │   ├── stores/auth.ts  # Pinia auth store (JWT in localStorage)
│   │   ├── api/client.ts   # Axios instance + typed API helpers
│   │   └── views/          # Landing / Login / Admin
│   └── package.json
├── Dockerfile          # multi-stage: web → server → runtime (alpine)
├── docker-compose.yml  # app + MongoDB with healthchecks
├── .github/workflows/ci.yml
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker 24+ and Docker Compose v2 (for containerized run)
- A local MongoDB instance is **not** required if you use Docker Compose.

## Quick start (Docker Compose, recommended)

```sh
cp .env.example .env
# edit .env — at minimum set JWT_SECRET and ADMIN_PASSWORD
docker compose up --build
```

Then open <http://localhost:3000>.

- The landing page shows the (initially empty) link list.
- Click **Login**, sign in with the admin credentials from `.env`, then add
  links via **Admin**.

To tear down and wipe data:

```sh
docker compose down -v
```

## Local development (without Docker)

Run MongoDB any way you prefer; the simplest is:

```sh
docker run -d --name mongo-dev -p 27017:27017 mongo:7
```

Then start the backend and frontend in two terminals:

```sh
# Terminal 1 — backend (http://localhost:3000)
cd server
cp ../.env.example .env
# edit MONGO_URI to mongodb://localhost:27017/devtools
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd web
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend on port 3000, so the SPA
can call the API without any CORS configuration.

## Configuration

All configuration is via environment variables. See [`.env.example`](./.env.example)
for the full list.

| Variable         | Required | Default                  | Description                                                         |
| ---------------- | -------- | ------------------------ | ------------------------------------------------------------------- |
| `PORT`           | no       | `3000`                   | HTTP listen port                                                    |
| `MONGO_URI`      | **yes**  | —                        | MongoDB connection string                                           |
| `JWT_SECRET`     | **yes**  | —                        | HMAC secret for JWT signing (≥ 16 chars). Use a long random string. |
| `JWT_EXPIRES_IN` | no       | `12h`                    | JWT lifetime (zeit/ms format)                                       |
| `ADMIN_USERNAME` | no       | `admin`                  | Username for the seeded admin                                       |
| `ADMIN_PASSWORD` | **yes**  | —                        | Password for the seeded admin (≥ 6 chars). **Change it.**           |
| `LOG_LEVEL`      | no       | `info`                   | pino log level                                                      |
| `STATIC_DIR`     | no       | `./web` inside container | Override path to the built SPA                                      |
| `NODE_ENV`       | no       | `development`            | `production` enables stricter CORS / CSP                            |

> **Important.** The admin user is created on first boot only if no admin
> exists. Set `ADMIN_PASSWORD` to a strong value before exposing the service
> on a shared network. Changing the env var after the user has been created
> does **not** rotate the password — log in and use the API/Mongo shell to
> update it.

## API reference

All endpoints return JSON. Mutating routes require a `Bearer` JWT.

| Method | Path              | Auth   | Description                                  |
| ------ | ----------------- | ------ | -------------------------------------------- |
| GET    | `/api/health`     | public | Liveness probe                               |
| POST   | `/api/auth/login` | public | Body `{ username, password }` → `{ token }`  |
| GET    | `/api/links`      | public | List all links, sorted by `sortOrder, title` |
| POST   | `/api/links`      | admin  | Create a link                                |
| PUT    | `/api/links/:id`  | admin  | Partially update a link                      |
| DELETE | `/api/links/:id`  | admin  | Delete a link                                |

A link object looks like:

```json
{
  "id": "66b3…",
  "title": "Grafana",
  "url": "https://grafana.example.com",
  "description": "Dashboards and metrics",
  "icon": "https://grafana.com/static/img/menu/grafana2.svg",
  "category": "Observability",
  "sortOrder": 10,
  "createdAt": "2026-06-05T10:00:00.000Z",
  "updatedAt": "2026-06-05T10:00:00.000Z"
}
```

The `icon` field is a free-form string. The SPA renders it as an `<img>`
when it starts with `http(s)://`; otherwise it falls back to the title's
initials. This makes it cheap to plug in a different icon scheme later
(e.g. an icon-font name).

## Testing

```sh
cd server
npm test
```

Smoke tests cover the health endpoint, login happy/sad paths, public link
listing, an authenticated CRUD lifecycle, and request validation. They run
against an in-memory MongoDB so they need no external services.

The frontend currently has no automated tests; manual verification is
described in the next section.

## Manual verification checklist

1. `docker compose up --build` → wait for `HTTP server listening`.
2. `curl -s http://localhost:3000/api/health` → `{"status":"ok",…}`.
3. Open <http://localhost:3000>, log in with the admin credentials.
4. Add a link in **Admin** (e.g. title _Grafana_, URL `https://grafana.com`).
5. Navigate to **Home** — the new card appears.
6. Edit and delete the link; the home grid reflects the changes.
7. Without a token: `curl -i -X POST http://localhost:3000/api/links -H 'Content-Type: application/json' -d '{"title":"x","url":"https://x"}'` → `401`.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and
pull request to `main`:

1. **build-test** — installs both packages, runs ESLint, `tsc`, the Vite
   build, and the server's vitest suite on Node 20.
2. **docker** — on push to `main`, builds the multi-stage image and pushes it
   to GitHub Container Registry (`ghcr.io/<owner>/<repo>:latest` and a
   commit-SHA tag) using the workflow's `GITHUB_TOKEN`.

## Security notes

- Admin passwords are stored as bcrypt hashes (cost 12).
- `helmet` sets the standard security headers (CSP enabled in production).
- The login endpoint is rate-limited (10 attempts / 15 min / IP).
- All request bodies are validated with `zod` before they touch the database.
- The JWT secret is read from the environment and never logged; `pino` is
  configured to redact `Authorization` headers and any field named
  `password`/`passwordHash`.
- The container image runs as a non-root user.
- The token is stored in `localStorage` to keep the demo simple. For a
  production deployment, switch to an `httpOnly` cookie with CSRF protection.

## Deployment

The provided artifacts (`Dockerfile`, `docker-compose.yml`) are enough for a
single-host deployment behind a reverse proxy that terminates TLS. For
Kubernetes, point a `Deployment` at the image produced by CI, supply the same
env vars via a `Secret`, expose port `3000` through a `Service`, and front it
with an `Ingress`. A managed MongoDB (Atlas, DocumentDB, …) can replace the
compose-managed instance — only `MONGO_URI` needs to change.

## License

MIT — see [LICENSE](./LICENSE).
