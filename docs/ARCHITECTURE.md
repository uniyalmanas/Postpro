# Postmill Application Architecture

**Version:** v1.2.0
**Last Updated:** October 21, 2026

## 1. System Overview

Postmill is an open-source, AI-native platform to schedule social media and chat posts to 45+ channels. The system provides scheduled publishing, a calendar view, persisted analytics, team management (RBAC), and a media library with AI generation studios.

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                            BROWSER                                    │
│  ┌─────────────┐  ┌─────────────────────┐  ┌────────────────────┐ │
│  │  SPA User   │  │   Browser Extension │  │   SDK / n8n / Zapier │ │
│  │ (Next.js)   │  │   apps/extension    │  │ (apps/sdk, API key) │ │
│  └──────┬──────┘  └────────┬────────────┘  └───────┬──────────────┘ │
│          │                   │                     │                │
│      SWR │                   ▼                     ▼              │
│          ▼    ┌────────────────────────────────────────────────────┐ │
│   ┌────────────────────────────────────────────────────────────┐│
│   │  apps/frontend - Next.js App Router + React (port 4200)   ││
│   │  Tailwind 3, Sentry-instrumented                        ││
│   └───────────────────────┬─────────────────────────────────────┘│
│                            │                                  ││
│                            ▼                                  ││
│               ┌─────────────────────────────────────────────┐    ││
│               │  apps/backend - NestJS REST API (port 3000)    │    ││
│               │  controllers + middleware + Inngest serve      │    ││
│               │  real logic lives in libraries/nestjs-libraries │    ││
│               └───────────────────────┬─────────────────────┘    ││
│                                    │                            ││
│                             PostgreSQL                       Redis ││
│                             (Prisma 6.5, schema + migrations)  │    ││
│                                    │                            ││
│                                    ▼                            ││
│                            ProviderKernel                      ││
│                            (SOLE resolution path for all    ││
│                             external: AI, media, social,      ││
│                              storage, short-links, email,  ││
│                              VPN egress, etc.)               ││
┌─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Next.js App Router + React | Port 4200, Tailwind 3/4, Sentry-instrumented |
| **Backend** | NestJS REST API | Port 3000, thin controller layer, real logic in libraries |
| **Database** | PostgreSQL | Prisma 6.5.0 ORM, schema in `nestjs-libraries/src/database/prisma/schema.prisma` |
| **Cache/Queue** | Redis | Throttling, caching, Inngest queue backing |
| **Background Jobs** | Inngest | Only background-job orchestrator; serve endpoint at `/api/inngest` |
| **Provider Framework** | Provider Kernel | Unified resolution path for 150+ providers (AI, media, social, storage, etc.) |
| **RBAC** | AppRole + Permission | 18 resources × 5 actions = 90 permissions, org-scoped |
| **Authentication** | JWT + OIDC | Sessions with refresh-token rotation, PKCE for OAuth |
| **Styling** | Tailwind 3/4 + Mantine | Shared components via `@postmill-ai/react` |
| **Testing** | Vitest | Full suite: helpers → providers → nestjs-libraries → backend → frontend → sdk → extension |

### 1.3 Key Directories

| Path | Purpose |
|------|---------|
| `apps/backend` | Thin NestJS REST API: controllers, middleware, Inngest function definitions + serve handler at `/api/inngest`. Business logic does **not** live here. |
| `apps/frontend` | Next.js App Router + React, port 4200. |
| `apps/extension` | Browser extension. |
| `apps/sdk` | Published SDK, npm name `@postmill-ai/postmill-sdk`. |
| `libraries/nestjs-libraries` | The bulk of all server logic: services, managers, Prisma schema + migrations, repositories, Inngest activities, provider resolution. |
| `libraries/helpers` | Shared isomorphic utilities: `useFetch`, `AuthService` JWT helpers, `ConfigurationChecker`. |
| `libraries/react-shared-libraries` | Shared React components/hooks (canonical `Button`, `Input`, `useT`). |
| `libraries/providers` | Unified provider framework: `kernel/` + ~150 provider packages, one directory per provider id. |
| `tools/` | Repo-owned tooling, **not a workspace**: `tools/db` (migration/backfill helpers) and `tools/codegen` (generators whose output is committed). |
| `docker/` | Docker artifacts: `Dockerfile`, `docker-compose.yaml`, `.dockerignore`. |

### 1.4 Import Aliases (`tsconfig.base.json`)

| Alias | Resolves To | Note |
|-------|-----------|------|
| `@postmill-ai/backend/*` | `apps/backend/src/*` | Alias only — package's real name is `postmill-backend`. |
| `@postmill-ai/frontend/*` | `apps/frontend/src/*` | |
| `@postmill-ai/helpers/*` | `libraries/helpers/src/*` | Matches package name `@postmill-ai/helpers`. |
| `@postmill-ai/nestjs-libraries/*` | `libraries/nestjs-libraries/src/*` | Matches package name. |
| `@postmill-ai/react/*` | `libraries/react-shared-libraries/src/*` | **≠ package name** (`@postmill-ai/react-shared-libraries`). Import via the alias, not the package name. |
| `@postmill-ai/extension/*` | `apps/extension/src/*` | |
| `@postmill-ai/provider-kernel` | `libraries/providers/kernel/src` (+`/*`) | |
| `@postmill-ai/provider-<id>` | `libraries/providers/<id>/src` (+`/*`) | One alias pair per provider package (~150). |

### 1.5 Request Lifecycle

**Boot order (`apps/backend/src/main.ts`):**

1. `import './register-provider-paths'` — first line; installs the runtime resolver for bare `@postmill-ai/provider-*` imports before any transitive require of a provider package.
2. `initializeOtel()` (`@postmill-ai/nestjs-libraries/otel/initialize.otel`) — before Sentry and before Nest creation so auto-instrumentations patch modules as they load; no-op unless configured (`DEV_DISABLE_OPENTELEMETRY`).
3. `initializeSentry('backend', true)` (`@postmill-ai/nestjs-libraries/sentry/initialize.sentry`).
4. NestJS application initialization with global pipes (`whitelist` + `forbidNonWhitelisted`), guards (`ThrottlerBehindProxyGuard`, `OrgRbacGuard`), and interceptors.
5. Provider kernel resolution service ready for all outbound HTTP via `safeFetch`.

**Key invariants during request lifecycle:**

- **Tenant isolation:** All queries scope by `organizationId` via Prisma middleware or explicit filtering. `@RequirePermission(resource, action)` + `OrgRbacGuard` enforces RBAC.
- **Input validation:** Global validation pipe rejects unknown fields (`whitelist` + `forbidNonWhitelisted`). DTOs declare new optional fields.
- **CSRF:** Required on cookie-authenticated mutating routes (controllers in `authenticatedController` array get it automatically).
- **Secret leakage:** Sentry scrubber (`libraries/nestjs-libraries/src/sentry/initialize.sentry.ts`) is the backstop; capture is disabled at source.
- **No env `OPENAI_API_KEY` fallback:** AI keys live in `AIOrgProviderConfig`, encrypted at rest. No active AI provider for an org ⇒ AI is **off** for that org.

### 1.6 Data Flow

**Post creation → publishing flow:**

1. User creates Post via frontend → `POST /posts` → NestJS controller
2. Controller validates DTO → service layer → repository (Prisma)
3. Post stored with `state: QUEUE`, `creationMethod: USER`/`AI_DESIGNER`/`UNKNOWN`
4. Inngest function triggers: `publish_post` scheduled at `publishDate`
5. Inngest activity resolves provider via ProviderKernel: `domain/providerId@version`
6. Provider kernel calls appropriate provider package (e.g., `ai/openai@v1`, `social/twitter@v1`)
7. `safeFetch` wraps all outbound HTTP with SSRF protection
8. Provider returns response → Post state updated (SCHEDULED → PUBLISHED/ERROR)
9. AnalyticsSnapshot written post-publication
10. Notification sent per `NotificationPreference` categories

### 1.7 Identity, RBAC & Sessions

- **User / UserProfile split:** `User` keeps identity/auth columns; profile fields (name, bio, pictureId, timezone, notification prefs) live on `UserProfile` (1:1).
- **AppRole:** org-scoped (NULL org = system template); `key` = owner/admin/editor/member/viewer; `isSystem` = seeded.
- **Permission catalog:** 18 resources × 5 actions = 90 seeded. Gating: `@RequirePermission(resource, action)` + `OrgRbacGuard`.
- **Sessions & refresh tokens:** `Session` model backs refresh-token rotation (login creates, refresh rotates `tokenHash`, reuse of rotated hash revokes, logout sets `revokedAt`).
- **Platform auth providers:** `AuthProviderConfig` managed by separate administration app; this repo only reads it (DB-first, env-bootstrap fallback). `LOCAL` auth always available unless `DISABLE_REGISTRATION`; OIDC SSO via `Provider.GENERIC`.

### 1.8 Removed Legacy Subsystems

**Do NOT resurrect these dropped Prisma models/code paths:**

- `SocialMediaAgency`, `MessagesGroup`, `Orders`, `OrderItems`, `PayoutProblems`, `ItemUser`, `GitHub`, `Star`, `Trending`, `TrendingLog`, `Messages` + associated enums (`OrderStatus`, `From`)
- Legacy `Role` enum and `UserOrganization.role` column — superseded by `AppRole`-based RBAC
- Legacy `/third-party` integration subsystem — deleted (HeyGen Studio now handles AI avatar video)
- Previous workflow orchestrator — replaced by Inngest
- Legacy global provider-config tables `AIProviderConfig` and `ProviderConfiguration` — dropped in v1.0.0
- Deprecated `UserProfile.send*Emails` toggles — replaced by `NotificationPreference.categories`

---

## 2. Repository Layout

**PNPM monorepo.** Workspaces driven by `pnpm --filter`. **pnpm only — never npm/yarn.**

### 2.1 App Workspaces

| Path | Description |
|------|-------------|
| `apps/backend` | Thin NestJS REST API. Kept **thin**: controllers + module wiring. Real logic lives in libraries. |
| `apps/frontend` | Next.js App Router + React, port 4200, Tailwind 3, Sentry-instrumented. |
| `apps/extension` | Browser extension. |
| `apps/commands` | CLI commands. |
| `apps/sdk` | Published SDK, npm name `@postmill-ai/postmill-sdk`. |

### 2.2 Library Workspaces

| Path | Description |
|------|-------------|
| `libraries/nestjs-libraries` | The bulk of all server logic: services, managers, Prisma schema + migrations, repositories, Inngest activities, provider resolution. |
| `libraries/helpers` | Shared isomorphic utilities: `useFetch`, `AuthService` JWT helpers, `ConfigurationChecker`. |
| `libraries/react-shared-libraries` | Shared React components/hooks (canonical `Button`, `Input`), i18n (`useT`). |
| `libraries/providers` | Unified provider framework: `kernel/` + ~150 provider packages, one directory per provider id. |

### 2.3 Tools & Docker

| Path | Description |
|------|-------------|
| `tools/` | Repo-owned tooling, **not a workspace**. `tools/db` (migration/backfill helpers, incl. two CI schema gates) and `tools/codegen` (generators whose output is committed and drift-gated). |
| `docker/` | All Docker artifacts except the three pinned at root: `Dockerfile` (the image CI publishes), `docker-compose.yaml` (sets Compose project name/volume prefix), `.dockerignore`. |

### 2.4 Agent-Facing Docs

| Path | Description |
|------|-------------|
| `agents/` | Agent-facing how-to docs (see [agents/README.md](./agents/README.md)). |
| `agents/libraries.md` | Deep tour of the libraries. |
| `agents/skills/` | Executable skills (`<skill-name>/SKILL.md`): task procedures that wrap the docs. |
| `agents/providers/overview.md` | How to add a provider in any domain. |

---

## 3. Key Conventions & Invariants

### 3.1 Versioning

- **Product release:** `vX.Y.Z` tag. Root docs speak of `v1.0.0` as first public release; inherited 3.x/4.x numbering was pre-release internal development.
- **SDK release:** `sdk-vX.Y.Z` tag, published to npm and GitHub Packages, independent of product release.
- **Extension release:** Published to Chrome Web Store, independent versioning.

### 3.2 Feature Flags

Feature flags control optional subsystems. Default all enabled; set to `true` to disable:

| Flag | Effect |
|------|--------|
| `DEV_DISABLE_AI` | Disables AI providers org-wide |
| `DEV_DISABLE_MEDIA` | Disables media generation studios |
| `DEV_DISABLE_MCP` | Disables Multi-Channel Platform |
| `DEV_DISABLE_EMAIL` | Disables email sending |
| `DEV_DISABLE_VIDEO` | Disables video rendering |
| `DEV_DISABLE_AGENT` | Disables agent workflows |
| `DEV_DISABLE_CRON` | Disables cron jobs |
| `DEV_DISABLE_SENTRY` | Disables Sentry instrumentation |
| `DEV_DISABLE_OPENTELEMETRY` | Disables OpenTelemetry |
| `DEV_DISABLE_COMMS` | Disables comms (notifications, etc.) |

Example minimal dev command:
```bash
DEV_DISABLE_AI=true DEV_DISABLE_MEDIA=true pnpm run dev:minimal
```

### 3.3 Golden Rules (Condensed)

**Backend layering:** Controller → Service → Repository (→ Manager when involved). Only repositories touch Prisma. Logic lives in `libraries/nestjs-libraries`, not `apps/backend`. Sanctioned exceptions exist (seeders); don't "fix" them.

**Frontend:** bespoke primitives first — `Button`/`Input` from `@postmill-ai/react/form/*`, `useModals()` for modals; Mantine only for Autocomplete/dates/hooks; no new UI kits; no `--color-custom*` tokens; SWR via `useFetch`, one hook per resource, never eslint-disable a hook.

**Database:** schema changes via committed migrations; `prisma migrate deploy` is the only apply path for shared/production DBs; new columns nullable or defaulted; destructive changes need expand-contract + `ALLOW_DESTRUCTIVE_SCHEMA=true`.

**Channel credentials:** per-org `OrgProviderConfiguration` (encrypted) always wins; the platform env OAuth-app fallback is live, per-request, never persisted, and **channels only** — AI, short-link, and other provider credentials do NOT get an env fallback.

**AI providers:** 30 (17 direct + 13 hubs/gateways), BYOK, no env fallback. Keys live in `AIOrgProviderConfig`, encrypted at rest.

**Provider kernel:** the SOLE resolution path. No legacy in-memory registries or `PROVIDER_KERNEL=legacy` kill switch.

**Secrets at rest:** encrypted via `EncryptionService` (AES-GCM, `v2:` prefix). Single-key model: no per-org crypto key; cross-org isolation enforced by query scoping.

**Inngest idempotency ids:** must be event-unique — a constant id black-holes reschedules.

**JWT:** verification pins `algorithms: ['HS256']`; new tokens carry `exp` with sliding renewal; session-auth verify sites require `exp` (legacy exp-less session tokens rejected).

**CSRF:** required on cookie-authenticated mutating routes. Global validation pipe rejects unknown fields (`whitelist` + `forbidNonWhitelisted`).

**Two orthogonal access gates:** billing (`@CheckPolicies` + `PoliciesGuard`) → 402; RBAC (`@RequirePermission` + `OrgRbacGuard`) → 403. `User.isSuperAdmin` bypasses RBAC, not billing.

**Throttling:** `ThrottlerBehindProxyGuard` throttles by default, `API_LIMIT` default 600/h.

**NOT_SECURED:** dev-only toggle — with `NODE_ENV=development` it relaxes helmet/HSTS and cookie `Secure`/`sameSite` flags. Never set it in production.

**No secrets/PII in Sentry, error storage, or logs:** the Sentry scrubber is the backstop; capture is disabled at source.

---

## 4. Setup & Commands

### 4.1 Installation

```bash
pnpm install              # also runs prisma-generate via postinstall
```

### 4.2 Development

**Full dev (all apps in parallel):**
```bash
pnpm run dev
```

**Minimal dev (backend + frontend only, recommended):**
```bash
pnpm run dev:minimal
```

**With feature flags disabled:**
```bash
DEV_DISABLE_AI=true DEV_DISABLE_MEDIA=true \
DEV_DISABLE_EMAIL=true pnpm run dev:minimal
```

**Backend only:**
```bash
pnpm run dev:backend
```

**Frontend only (port 4200):**
```bash
pnpm run dev:frontend
# or with Turbopack:
pnpm run dev:frontend
```

### 4.3 Docker Development

```bash
# Required services only: postgres + redis
docker compose -f ./docker/docker-compose.dev.yaml up -d

# Add background jobs (Inngest dev server)
docker compose -f ./docker/docker-compose.dev.yaml --profile jobs up -d
```

### 4.4 Build

```bash
pnpm run build            # frontend + backend
pnpm run build:backend   # backend only
pnpm run build:frontend  # frontend only
pnpm run build:extension # extension only
```

### 4.5 Database (Prisma 6.5.0)

```bash
pnpm run prisma-generate  # regenerate client after editing schema.prisma
pnpm run prisma-db-push   # push schema to the DB (local prototyping/reset only)
pnpm run prisma-migrate-dev  # create new migration
pnpm run prisma-migrate-deploy  # deploy migrations to shared/production DB
pnpm run prisma-migrate-resolve  # resolve migration issues
pnpm run prisma-reset     # full reset (force + push)
```

### 4.6 Test

```bash
pnpm run test             # run full test suite (all packages)
vitest run --root apps/backend    # run backend tests only
vitest run --root apps/frontend   # run frontend tests only

# Test with coverage
pnpm run test:coverage

# Integration tests
pnpm run test:int
```

### 4.7 OpenAPI Generation

```bash
# Refresh openapi.yml after a route/DTO change
# Requires DATABASE_URL, REDIS_URL, JWT_SECRET
pnpm run openapi:generate
```

### 4.8 Code Generation

```bash
# Refresh provider metadata
node tools/codegen/generate-studio-descriptor-registry.mjs

# Generate OpenAPI from controllers
pnpm run openapi:generate
```

---

## 5. Security Invariants (Do Not Break)

### 5.1 Authentication & Authorization

- **No env-`OPENAI_API_KEY` fallback.** No active AI provider for an org ⇒ AI is **off** for that org across all four surfaces (utility, generator, agent, mcp).
- **ProviderKernel is the sole resolution path.** (See §1.7)
- **All user-influenced outbound HTTP goes through `safeFetch`.** No bare `fetch(userUrl)`. `SSRF_ALLOWED_PRIVATE_CIDRs` is the opt-in for self-hosted instances.
- **Secrets at rest are encrypted via `EncryptionService`** (AES-GCM, `v2:` prefix). Single-key model: no per-org crypto key; cross-org isolation enforced by query scoping.
- **Never run blocking Redis (BRPOP/BLPOP/BRPOPLPUSH) on the shared `ioRedis` client.** Use `ioRedis.duplicate()`.
- **Inngest idempotency ids must be event-unique** — a constant id black-holes reschedules.
- **JWT verification pins `algorithms: ['HS256']`**; new tokens carry `exp` with sliding renewal; session-auth verify sites require `exp`.
- **CSRF is required on cookie-authenticated mutating routes** (controllers in the `authenticatedController` array get it automatically).
- **Global validation pipe rejects unknown fields** (`whitelist` + `forbidNonWhitelisted`) — declare new optional fields on their DTO.
- **Two orthogonal access gates:** billing (`@CheckPolicies` + `PoliciesGuard`) → 402; RBAC (`@RequirePermission` + `OrgRbacGuard`) → 403. `User.isSuperAdmin` bypasses RBAC, not billing.
- **Throttling is effective** (`ThrottlerBehindProxyGuard` throttles by default, `API_LIMIT` default 600/h).
- **NOT_SECURED is a dev-only toggle** — with `NODE_ENV=development` it relaxes helmet/HSTS and cookie `Secure`/`sameSite` flags. Never set it in production.
- **No secrets/PII in Sentry, error storage, or logs** — the Sentry scrubber is the backstop; capture is disabled at source.

### 5.2 Identity, RBAC & Sessions

- **Identity/profile split:** `User` keeps identity/auth columns; profile fields live on `UserProfile` (1:1).
- **RBAC:** `AppRole` (org-scoped; NULL org = system template; `key` = owner/admin/editor/member/viewer; `isSystem` = seeded). `Permission` catalog: **18 resources × 5 actions = 90** seeded. Gating: `@RequirePermission(resource, action)` + `OrgRbacGuard`.
- **Sessions & refresh tokens:** the `Session` model backs refresh-token rotation (login creates, refresh rotates `tokenHash`, reuse of a rotated hash revokes, logout sets `revokedAt`).
- **Platform auth providers:** `AuthProviderConfig` is managed by the **separate administration app**; this repo only reads it (DB-first, env-bootstrap fallback). `LOCAL` auth always available unless `DISABLE_REGISTRATION`; OIDC SSO via `Provider.GENERIC`.

### 5.3 Numbers Stated Once (Do Not Let Them Drift)

- **AI providers: 30** (17 direct + 13 hubs/gateways), BYOK, no env fallback.
- **Media tools: 46** = Designer + AI Designer + **38 provider studios** + **6 stock browsers**.
- **Channels: 45+.**
- **Background jobs: Inngest** (the previous workflow orchestrator was removed — there is **no `while(true)` poll loop and no `continueAsNew`**).
- **Notification categories: 10** — `post_published`, `post_failed`, `channels`, `comments`, `budget`, `media`, `announcements`, `streak`, `agent`, `analytics`. Hardcoded in three lockstep places (DTO, `DEFAULT_CATEGORY_TOGGLES`, frontend panel). `NotificationService` is the **single chokepoint** for user-facing email + in-app/push — never call `EmailService` directly from feature code.
- **Tests run on Vitest** (`vitest run --root <pkg>`). The old root `jest.config.ts` has been deleted — do not resurrect jest-style configuration.

---

## 6. Deep Dive: Libraries

For a complete tour of all libraries, see `agents/libraries.md`. Key sections:

- `agents/backend.md` — Backend recipes, service layer, DTO patterns, sanctioned exceptions
- `agents/frontend.md` — Frontend standards, component library, hooks, i18n
- `agents/database.md` — Schema changes, migration workflow, Prisma conventions
- `agents/providers/overview.md` — How to add a provider in any domain
- `agents/jobs.md` — Inngest function catalog
- `agents/testing.md` — Testing stack, vitest configuration, test patterns
- `agents/security.md` — Security invariants, enforcement points
- `agents/ui-standards.md` — UI component standards, Mantine vs custom, accessibility
- `agents/campaigns.md` — Campaigns and billing
- `agents/billing.md` — Billing and subscription design
- `agents/video-rendering.md` — Video rendering pipeline

---

## 7. Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.0.0 | — | First public release (inherited internal 4.x numbering) |
| v1.1.0 | — | Key features: improved RBAC, enhanced analytics, media studio v2 |
| v1.2.0 | October 2026 | **Current** — AIOrgProviderConfig reorganization, improved onboarding, enhanced provider kernel, new NotificationPreference system, expanded channel integrations (45+), improved RBAC granularity |

---

*This document was auto-generated as part of the product audit process. For task-oriented procedures, see the `agents/` documentation map.*