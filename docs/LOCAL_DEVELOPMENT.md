# Local Development Guide

**Postmill app v1.2.0**
**Last Updated:** October 21, 2026

## Overview

This guide covers local development setup, common commands, feature flags, and troubleshooting for the postmill monorepo.

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **pnpm** | 10.34.4 | Required — never use npm or yarn |
| **Node.js** | 24.19.0 (Volta) | Managed by Volta; see `.volta` directory |
| **PostgreSQL** | 15+ | Required for local development |
| **Redis** | 7+ | Required for caching, throttling, Inngest |
| **Docker** | 20+ | Recommended for services (Postgres + Redis) |
| **Volta** | Latest | Ensure `volta install` works |

## 2. Installation

```bash
# 1. Clone the repository
git clone https://github.com/postmill-ai/postmill-app.git
cd postmill-app

# 2. Install dependencies (also runs prisma-generate via postinstall)
pnpm install

# 3. Set up environment variables
cp .env.example .env

# 4. Configure .env (see section 3 below)
#    Required at minimum:
#   - DATABASE_URL (postgresql://...)

# 5. Generate Prisma client and push schema
pnpm run prisma-generate
pnpm run prisma-db-push  # local prototyping only

# 6. Start required services (Postgres + Redis)
#   Option A: Docker Compose
docker compose -f ./docker/docker-compose.dev.yaml up -d

#   Option B: Local services
#   Start PostgreSQL on default port 5432
#   Start Redis on default port 6379

# 7. Run database migrations (if needed)
pnpm run prisma-migrate-dev

# 8. Start development server
pnpm run dev:minimal
#   or full: pnpm run dev
```

## 3. Environment Variables

### 3.1 Required Variables (in `.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postmill:password@localhost:5432/postmill` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | CSPRNG-generated JWT secret | `openssl rand -hex 32` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `SITE_URL` | Site URL for absolute links | `http://localhost:3000` |

### 3.2 Feature Flags (Development Only)

Set these in `.env` or override on command line. **All default to `false` (enabled)**. Set to `true` to disable the subsystem.

| Flag | Description | Impact |
|------|-------------|--------|
| `DEV_DISABLE_AI` | Disable all AI providers org-wide | AI is "off" for all organizations; no generation possible |
| `DEV_DISABLE_MEDIA` | Disable media generation studios | AI Designer, all 38 provider studios, 6 stock browsers disabled |
| `DEV_DISABLE_MCP` | Disable Multi-Channel Platform | Channel integration and publishing disabled |
| `DEV_DISABLE_EMAIL` | Disable email sending | EmailService disabled; no emails sent |
| `DEV_DISABLE_VIDEO` | Disable video rendering | Video rendering pipeline disabled |
| `DEV_DISABLE_AGENT` | Disable agent workflows | Inngest activities for agents disabled |
| `DEV_DISABLE_CRON` | Disable cron jobs | Scheduled jobs disabled |
| `DEV_DISABLE_SENTRY` | Disable Sentry instrumentation | No error tracking to Sentry |
| `DEV_DISABLE_OPENTELEMETRY` | Disable OpenTelemetry | No distributed tracing |
| `DEV_DISABLE_COMMS` | Disable comms (notifications) | Notification categories disabled |

**Example `.env` with flags disabled:**
```
DEV_DISABLE_AI=true
DEV_DISABLE_MEDIA=true
DEV_DISABLE_EMAIL=true
DATABASE_URL=postgresql://postmill:password@localhost:5432/postmill
REDIS_URL=redis://localhost:6379
JWT_SECRET=openssl-rand-hex-32
NODE_ENV=development
SITE_URL=http://localhost:3000
```

### 3.3 Optional Services

| Service | Purpose | Default |
|---------|---------|---------|
| **Sentry** | Error tracking | Enabled if `SENTRY_DSN` set |
| **OpenTelemetry** | Distributed tracing | Enabled if `OTEL_EXPORTER_OTLP_ENDPOINT` set |
| **Stripe** | Payment processing | Required for billing features; set `STRIPE_SECRET_KEY` |
| **Google OIDC** | Single sign-on | Configurable via `AuthProviderConfig` |
| **Slack/VK/Telegram** | Social channel integrations | Each requires own OAuth setup |

## 4. Development Commands

### 4.1 Core Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies, run prisma-generate via postinstall |
| `pnpm run dev` | Start all apps (extension + backend + frontend) in parallel |
| `pnpm run dev:minimal` | Start backend + frontend only (recommended for daily dev) |
| `pnpm run dev:backend` | Start backend only |
| `pnpm run dev:frontend` | Start frontend only (port 4200, Turbopack) |
| `pnpm run dev:webpack` | Start frontend with Webpack fallback |
| `pnpm run analyze` | Bundle analysis report |

### 4.2 Database Commands

| Command | Description |
|---------|-------------|
| `pnpm run prisma-generate` | Regenerate Prisma client after editing schema |
| `pnpm run prisma-db-push` | Push schema to DB (local prototyping/reset only) |
| `pnpm run prisma-migrate-dev` | Create new migration (development) |
| `pnpm run prisma-migrate-deploy` | Deploy migrations to shared/production DB |
| `pnpm run prisma-migrate-resolve` | Resolve migration issues |
| `pnpm run prisma-reset` | Full reset (force push + push) |

### 4.3 Build Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build frontend + backend |
| `pnpm run build:backend` | Build backend only |
| `pnpm run build:frontend` | Build frontend only |
| `pnpm run build:extension` | Build extension only |

### 4.4 Test Commands

| Command | Description |
|---------|-------------|
| `pnpm run test` | Run full test suite (all packages) |
| `vitest run --root libraries/helpers` | Run helpers tests |
| `vitest run --root libraries/providers` | Run provider tests |
| `vitest run --root libraries/nestjs-libraries` | Run nestjs-libraries tests |
| `vitest run --root apps/backend` | Run backend tests |
| `vitest run --root apps/frontend` | Run frontend tests |
| `vitest run --root apps/commands` | Run commands tests |
| `vitest run --root apps/sdk` | Run SDK tests |
| `vitest run --root apps/extension` | Run extension tests |
| `pnpm run test:int` | Run integration tests (vitest-integration.config.ts) |
| `pnpm run test:coverage` | Run tests with coverage |

### 4.5 Code Generation

| Command | Description |
|---------|-------------|
| `pnpm run openapi:generate` | Refresh openapi.yml after route/DTO change |
| `node tools/codegen/generate-studio-descriptor-registry.mjs` | Refresh provider metadata |

### 4.6 Docker Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev:docker` | Start Docker dev services (postgres + redis) |
| `./docker/docker-build.sh` | Build Docker image (CI) |
| `./docker/docker-create.sh` | Create Docker container (CI) |

### 4.7 Feature-Flagged Development

**Recommended: Minimal dev with specific flags disabled**

```bash
# Disable AI and media, keep everything else
DEV_DISABLE_AI=true DEV_DISABLE_MEDIA=true \
  pnpm run dev:minimal

# Disable everything optional for fastest dev
DEV_DISABLE_AI=true DEV_DISABLE_MCP=true DEV_DISABLE_MEDIA=true \
  DEV_DISABLE_SHORTLINKS=true DEV_DISABLE_EMAIL=true \
  pnpm run dev:minimal
```

**Available feature flags:**
`DEV_DISABLE_AI`, `DEV_DISABLE_MCP`, `DEV_DISABLE_MEDIA`, `DEV_DISABLE_SHORTLINKS`,
`DEV_DISABLE_EMAIL`, `DEV_DISABLE_VIDEO`, `DEV_DISABLE_AGENT`, `DEV_DISABLE_CRON`,
`DEV_DISABLE_SENTRY`, `DEV_DISABLE_OPENTELEMETRY`, `DEV_DISABLE_COMMS`

## 5. Architecture Overview (Quick Reference)

### 5.1 Request Lifecycle

```
User Browser
    │
    ▼
Next.js Frontend (port 4200)
    │ SWR useFetch
    ▼
NestJS Backend (port 3000)
    │ ├─ validate DTO (pipes: whitelist + forbidNonWhitelisted)
    │ ├─ authenticate JWT / session
    │ ├─ OrgRbacGuard (@RequirePermission)
    │ ├─ ThrottlerBehindProxyGuard (600/h default)
    │ └─ safeFetch for all outbound HTTP
    ▼
ProviderKernel (libraries/providers)
    │ Resolves: domain/providerId@version
    │ Calls: appropriate provider package
    ▼
External: AI models, social channels, media generators, storage
    │
    ▼
PostgreSQL (Prisma 6.5) + Redis
    │ State, analytics, tokens, configs
    ▼
Inngest (background jobs)
    │ publish_post, retry_publish, detect_anomalies, etc.
    ▼
Response → Browser
```

### 5.2 Data Flow

**Post creation example:**
1. User creates Post via `/posts` POST endpoint
2. NestJS controller validates DTO → service layer → Prisma repository
3. Post stored with `state: QUEUE`, `creationMethod: USER`
4. Inngest function `publish_post` scheduled at `publishDate`
5. At `publishDate`, Inngest activity resolves provider via kernel
6. Provider package executes platform API call (OAuth authenticated)
7. `safeFetch` wraps HTTP with SSRF protection
8. Response handled: state → SCHEDULED/PUBLISHED/ERROR
9. AnalyticsSnapshot written post-publication
10. Notification sent per user's `NotificationPreference` categories

### 5.3 Key Models (Prisma Schema Highlights)

- **Organization:** Orgs with users, brands, integrations, AI configs, subscriptions
- **User / UserProfile:** 1:1 split; identity vs. profile fields
- **AppRole / Permission:** 18 resources × 5 actions = 90 RBAC permissions
- **Integration:** Per-channel OAuth credentials, tokens, posting times, scopes
- **OrgProviderConfiguration:** Per-org encrypted credentials per channel
- **AIBrandProfile:** Brand knowledge per organization (name, voice, terminology, prohibited claims, etc.)
- **AIOrgProviderConfig:** Per-org AI provider enabling, model selection, budget caps
- **Post:** Content with state machine (QUEUE → SCHEDULED → PUBLISHED/ERROR), approval status, brand relation
- **AnalyticsSnapshot:** Metric collection (reach, impressions, engagement, clicks, etc.)
- **AISpendLog:** AI usage tracking (input/output tokens, cost in USD)
- **Session:** Refresh-token rotation (login creates, refresh rotates tokenHash)

## 6. Common Development Tasks

### 6.1 Adding a New AI Provider

See `agents/providers/overview.md` for the full procedure. High-level steps:

1. Create `libraries/providers/<provider-id>/src/` package
2. Implement required interfaces (v1, v2, etc.)
3. Register in provider kernel
4. Add Zod validation schemas
5. Test with mock responses
6. Add to `openapi.yml` generation if needed

### 6.2 Adding a New Social Channel Integration

1. Create `Integration` entry (or use existing template)
2. Set up OAuth app in channel's developer console
3. Configure `OrgProviderConfiguration` per organization
4. Implement provider package in `libraries/providers/`
5. Add posting validation logic
6. Test OAuth flow end-to-end
7. Add analytics metric tracking if available

### 6.3 Adding a New Database Field

1. Edit `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
2. Run `pnpm run prisma-generate`
3. Run `pnpm run prisma-migrate-dev` (creates migration file)
4. Run `pnpm run prisma-migrate-deploy` (or `prisma db push` for local)
5. Update TypeScript types used in controllers/services
6. Add migration to CI schema gate (tools/db/schema-destructive-guard.mjs)

**Important:** Never make destructive schema changes without expand-contract strategy. Use `ALLOW_DESTRUCTIVE_SCHEMA=true` only with explicit justification.

### 6.4 Adding a New API Endpoint

1. Create DTO (`apps/backend/src/api/dtos/`) with class-validator decorators
2. Create service method (`libraries/nestjs-libraries/src/services/`)
3. Create repository method if touching Prisma (or use existing)
4. Create controller endpoint (`apps/backend/src/api/controllers/`)
5. Add route registration in `apps/backend/src/api/routes/*.ts`
6. Add test in `apps/backend/src/api/controllers/__tests__/`
7. Run `pnpm run openapi:generate` to refresh API docs
8. Add Vitest tests covering success and error cases

### 6.5 Frontend Development

| Task | Tool/Command |
|------|-------------|
| Create new page | `pnpm run dev:frontend`, then create `apps/frontend/src/app/...` |
| Add component | Use `@postmill-ai/react` primitives (Button, Input, etc.) |
| State management | SWR via `useFetch` hook; React Query not used |
| Styling | Tailwind 3/4 utility classes + Mantine for specific components |
| Forms | `react-hook-form` + `zod` for validation (matching backend DTOs) |
| Modals | `useModals()` hook from `@postmill-ai/react` |
| i18n | `useT` hook from `libraries/react-shared-libraries`; `i18next` |

**Frontend architecture (per agents/frontend.md):**
- Bespoke primitives first (`Button`/`Input` from `@postmill-ai/react/form/*`)
- `useModals()` for modals
- Mantine only for Autocomplete/dates/hooks
- No new UI kits
- No `--color-custom*` tokens
- One SWR hook per resource, never eslint-disable a hook

## 7. Troubleshooting

### 7.1 Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `ETIMEDOUT` on `pnpm install` | Network issues | Check internet; try `pnpm clear-store` and retry |
| Prisma P2003 (relation violation) | Missing migration | Run `pnpm run prisma-migrate-dev` |
| `EADDRINUSE` port 3000/4200 | Port already in use | Kill existing process or use `lsof -ti:3000 | xargs kill` |
| AI generation returns error | No AI provider configured | Set `AIOrgProviderConfig` with enabled + credentials for org |
| OAuth callback loop | Missing redirect URI | Ensure `redirectUri` matches channel app configuration |
| Redis connection lost | Docker container restart | `docker compose -f docker/docker-compose.dev.yaml up -d` |
| Sentry logging secrets | Missing scrubber config | Verify `initialize.sentry.ts` is importing correctly; check `NODE_ENV` |

### 7.2 Performance Optimization

**Backend:**
- Feature flags allow disabling optional subsystems for faster dev
- `DEV_DISABLE_AI=true` significantly speeds up dev without AI needs
- Redis caching reduces DB queries for frequently accessed data
- Throttling (600/h default) prevents abuse in dev

**Frontend:**
- Turbopack (default) for fast HMR; switch to Webpack with `pnpm run dev:webpack`
- `pnpm run analyze` to identify large bundles
- Mantine components are lazy-loaded where possible
- SWR revalidation is focused (one hook per resource)

**Docker:**
- `docker-compose.dev.yaml` only starts needed services
-- `--profile jobs` adds Inngest dev server for background jobs
- Use `DEV_DISABLE_*` flags to skip heavy subsystems

### 7.3 Debug Mode

- `NODE_ENV=development` enables:
  - Relaxed helmet/HSTS headers
  - Cookie `Secure` flag relaxed
  - Cookie `sameSite` lax instead of strict
  - Detailed error messages (not exposed to users)
- `NOT_SECURED` env var additionally relaxes:
  - Helmet settings
  - HSTS configuration
  - Allows development-friendly cookie settings

**Never set `NOT_SECURED` or `DEV_DISABLE_*` flags in production.**

## 8. Directory Quick Reference

```
postmill-app/
├── apps/              # Workspace apps
│   ├── backend/       # NestJS API (port 3000)
│   ├── frontend/      # Next.js App Router (port 4200)
│   ├── extension/     # Browser extension
│   ├── sdk/           # Published npm package
│   └── commands/      # CLI commands
├── libraries/         # Shared libraries
│   ├── nestjs-libraries/  # Core server logic, Prisma, providers
│   ├── helpers/       # Isomorphic utilities
│   ├── react-shared-libraries/  # Shared React components
│   └── providers/     # 150+ provider packages + kernel
├── docs/              # This guide + PRODUCT_AUDIT.md, ARCHITECTURE.md, IMPLEMENTATION_ROADMAP.md
├── tools/             # DB migration helpers, code generators
├── docker/            # Docker artifacts
├── agents/            # Agent-facing how-to docs
├── e2e/             # Playwright test suite
├── package.json       # Root deps, scripts, pnpm config
├── pnpm-workspace.yaml  # Workspace definition
├── version.txt        # v1.2.0
└── AGENTS.md          # AI agent development guidance
```

## 9. Getting Help

| Resource | Link/Location |
|----------|---------------|
| **AGENTS.md** | Root directory — guidance for AI coding agents |
| **agents/README.md** | Agent development doc map |
| **agents/libraries.md** | Deep tour of all libraries |
| **agents/backend.md** | Backend recipes and patterns |
| **agents/frontend.md** | Frontend standards and components |
| **agents/testing.md** | Testing stack and patterns |
| **agents/security.md** | Security invariants and enforcement |
| **agents/providers/overview.md** | How to add a provider |
| **GitHub Issues** | https://github.com/postmill-ai/postmill-app/issues |
| **Discord/Slack** | Community channel (check repo for invite) |

**For immediate issues:**
1. Check `pnpm run lint` for code style problems
2. Run `pnpm run test` to see failing tests
3. Check `docker compose -f docker/docker-compose.dev.yaml logs` for Docker issues
4. Review recent changes in `git diff` for regressions

---

*This guide was generated as part of the local development documentation suite. For task-specific procedures, refer to the `agents/` documentation map.*