# How to Run the Postmill Project

## Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Volta** (Node manager) | Latest | `volta install node` |
| **Node.js** | 24.19.0 | `volta install node@24.19.0` |
| **pnpm** | 10.34.4 | `volta install pnpm@10.34.4` |
| **PostgreSQL** | 15+ | Install locally or use Docker |
| **Redis** | 7+ | Install locally or use Docker |
| **Git** | Latest | `git install` |

## Step 1: Install Dependencies

```bash
# Clone the repository (if not already done)
git clone https://github.com/postmill-ai/postmill-app.git
cd postmill-app

# Install all dependencies (also runs prisma-generate via postinstall)
pnpm install
```

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

**Edit `.env` with the following minimum required values:**

```env
# Database
DATABASE_URL=postgresql://postmill:password@localhost:5432/postmill

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=openssl rand -hex 32
NODE_ENV=development

# Site URL
SITE_URL=http://localhost:3000

# Optional: Feature flags (all default to false/enabled)
# DEV_DISABLE_AI=true          # Disable AI providers
# DEV_DISABLE_MEDIA=true       # Disable media studios
# DEV_DISABLE_EMAIL=true       # Disable email sending
```

## Step 3: Start Required Services

### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL + Redis + optional services
docker compose -f ./docker/docker-compose.dev.yaml up -d

# Add Inngest dev server for background jobs
docker compose -f ./docker/docker-compose.dev.yaml --profile jobs up -d
```

### Option B: Local Services

```bash
# Start PostgreSQL on port 5432
# Start Redis on port 6379
# Ensure both are running before proceeding
```

## Step 4: Database Setup

```bash
# Generate Prisma client
pnpm run prisma-generate

# Push schema to database (local prototyping)
pnpm run prisma-db-push

# Run migrations (if needed)
pnpm run prisma-migrate-dev
```

## Step 5: Start the Development Server

### Full Dev (all apps: extension + backend + frontend)

```bash
pnpm run dev
```

### Minimal Dev (backend + frontend only - recommended)

```bash
pnpm run dev:minimal
```

### With Feature Flags Disabled (fastest dev)

```bash
DEV_DISABLE_AI=true DEV_DISABLE_MEDIA=true \
DEV_DISABLE_EMAIL=true pnpm run dev:minimal
```

### Backend Only

```bash
pnpm run dev:backend
```

### Frontend Only (port 4200, Turbopack)

```bash
pnpm run dev:frontend
```

## Step 6: Verify It's Running

### Backend (port 3000)
- Visit: `http://localhost:3000/health`
- Should return OK status
- Visit: `http://localhost:3000/api` - see API routes

### Frontend (port 4200)
- Visit: `http://localhost:4200`
- Should show the login/signup page
- Navigate to various modules

### Quick Test

```bash
# Check if the API is responsive
curl http://localhost:3000/health

# Check if frontend is responsive
open http://localhost:4200
```

## Step 7: Access the Application

### Default Login Credentials (if seeded)

Check `CONTRIBUTING.md` or database for default users, or use:
- Sign up via `http://localhost:4200/signup`
- Or use OAuth providers if configured

### Key Pages to Explore

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Main workspace dashboard |
| Organizations | `/organizations` | Manage client organizations |
| Posts | `/posts` | Create and manage posts |
| Calendar | `/calendar` | Post scheduling calendar |
| Analytics | `/analytics` | Performance metrics |
| **Campaign Planning** | `/campaign-planning` | **NEW: Campaign Planning Agent** |

### NEW: Campaign Planning Agent

| Feature | Access Path |
|---------|-------------|
| Generate campaign plan | Dashboard → Campaign Planning or `/campaign-planning` |
| Fill brief form → AI generation | Input title, objective, platforms, brand details |
| Review generated plan | See objectives, themes, calendar, draft posts |
| Edit drafts | Inline editing or navigate to posts |
| Submit for approval | Via approval workflow |

## Common Issues & Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `EADDRINUSE` port 3000/4200 | Another process using the port | Kill existing process or change port in config |
| Prisma errors (P2003, P2014) | Schema mismatch or missing migration | Run `pnpm run prisma-migrate-dev` |
| AI generation errors | No AI provider configured | Set `AIOrgProviderConfig` or disable `DEV_DISABLE_AI=true` |
| Redis connection lost | Docker container stopped | `docker compose -f docker/docker-compose.dev.yaml up -d` |
| OAuth callback loop | Missing redirect URI | Configure redirect URI in channel developer console |
| `DEV_DISABLE_*` flags not working | Wrong env variable format | Ensure `.env` has `KEY=value` format, no spaces |
| `EACCES` on prisma-migrate | Database permissions | Ensure postgres user has schema creation rights |

## Docker Quick Start

```bash
# Full stack in one command
docker compose -f ./docker/docker-compose.dev.yaml up -d

# Then in another terminal:
pnpm run dev:minimal
```

**Services started by docker-compose:**
- PostgreSQL (port 5432)
- Redis (port 6379)
- Optional: Mailhog (email debugging), OpenTelemetry, Sentry

## npm/pnpm Commands Cheat Sheet

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run dev:minimal` | Start backend + frontend |
| `pnpm run dev` | Start all apps (extension + backend + frontend) |
| `pnpm run build:backend` | Build backend only |
| `pnpm run build:frontend` | Build frontend only |
| `pnpm run test` | Run full test suite |
| `pnpm run prisma-generate` | Regenerate Prisma client |
| `pnpm run prisma-db-push` | Push schema to DB |
| `pnpm run openapi:generate` | Refresh API documentation |

## Development Workflow

1. **Make code changes** in the appropriate `apps/` or `libraries/` directory
2. **Run `pnpm run prisma-generate`** if Prisma schema changed
3. **Run `pnpm run build:backend`** to compile NestJS
4. **Run `pnpm run build:frontend`** or use `dev` mode for hot reload
5. **Run `pnpm run test`** to verify no regressions
6. **Test manually** via browser at `localhost:4200` and `localhost:3000`
7. **Check logs** via `docker compose logs -f` or terminal output

## Directory Structure (Quick Reference)

```
postmill-app/
├── apps/backend/     # NestJS API (port 3000) - YOUR CHANGES HERE
├── apps/frontend/    # Next.js App Router (port 4200) - YOUR CHANGES HERE
├── libraries/        # Shared logic (providers, helpers, react components)
├── docs/             # Documentation (PRODUCT_AUDIT, ARCHITECTURE, ROADMAP)
├── docker/           # Docker configs
├── tools/            # DB migration helpers, code generators
├── package.json      # Root config (pnpm workspaces)
└── version.txt       # v1.2.0
```

## Need Help?

- Check `AGENTS.md` at repo root for agent development guidance
- Read `CONTRIBUTING.md` for development guidelines
- Review `ARCHITECTURE.md` for system design
- Run `pnpm run test` to see test suite status
- Check `docker-compose.dev.yaml` for service configuration

---
*Generated for postmill-app v1.2.0. Follow the AGENTS.md guidelines when making changes.*