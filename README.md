# Shipyard

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-RDS-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Isolated_Builds-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2+RDS+S3-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers+KV+Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Live_Logs-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-Portfolio-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=for-the-badge)

> Push to main. It ships itself.

A static-site deployment platform: connect a GitHub repo, push a commit, and a webhook triggers a build inside an isolated, disposable Docker container. The output lands on S3 and goes live on your own `*.shpit.uk` subdomain within seconds — with build logs streamed to your browser line by line as they happen, not after the fact.

**Isolated per-build containers · Real-time log streaming · Edge-routed subdomains · Per-repo build overrides · Cross-platform lockfile resilience**

Built by **Abdallah Khatib** — Computer Science graduate, Lebanese International University.

---

## 🌐 Live Demo

| | URL |
|---|---|
| **Frontend** | [shipyard.shpit.uk](https://shipyard.shpit.uk) |
| **API** | [api-shipyard.shpit.uk](https://api-shipyard.shpit.uk) |

> The full stack is live — EC2 (Docker + nginx + Certbot), RDS MySQL, Redis Cloud, and Cloudflare Pages + Workers + KV, all wired together and tested end to end against real infrastructure, not a local demo.

---

## What Shipyard is, and isn't

Shipyard is free subdomain hosting for people who don't have — or don't need — their own domain. If you already own a domain and want Vercel- or Netlify-grade custom-domain routing, CDN edge network, and preview deployments per pull request, this isn't trying to replace that. Shipyard's job is the other half of that market: the person who just wants to push a repo and get a real, working, live URL without owning anything or paying anything.

Everything that makes that promise trustworthy — actual container isolation, actual resource limits, actual disposability — is built the same way a paid platform would build it, just scoped to that one job.

---

## Table of Contents

- [About](#about)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Architecture Decisions](#architecture-decisions-worth-knowing)
- [API Reference](#-api-reference)
- [Build Detection & Overrides](#-build-detection--overrides)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Database Schema](#️-mysql-schema)
- [Running Locally](#-running-locally)
- [Known Limitations](#known-limitations--honest-caveats)
- [About the Author](#-about)

---

## About

Shipyard exists to answer a specific engineering question properly: what does it actually take to run *other people's code* safely, on demand, at low cost? Not "runs a script in a subprocess," but correctly — a fresh container per build, hard CPU/memory/time limits, no network path to anything else running on the host, and unconditional teardown whether the build succeeds, fails, or times out.

It was built backend-first: the webhook receiver, build queue, and container runner proven working end to end before a single page of frontend existed, then deployed to real production infrastructure — not left as a "works on my machine" demo. Every real-world failure encountered along the way — a cross-platform npm lockfile mismatch, a monorepo with no root `package.json`, garbled terminal output from a build tool's own progress spinner, an IAM permissions boundary silently blocking S3 writes, a shared Redis queue getting raced by two backend instances at once, a memory-starved build container on a 1GB server — was fixed as a real, distinct bug against real infrastructure, not designed around in the abstract.

---

## ✨ Key Features

### 🐳 Isolated, Disposable Builds
- Every build runs in a fresh Docker container, created fresh and destroyed unconditionally afterward — success, failure, or timeout
- Hard resource limits enforced by the Docker daemon itself, not just declared in config: memory cap (with swap disabled so the cap can't be bypassed), CPU cap, process count limit, all capabilities dropped, no new privileges
- Isolated bridge network: outbound internet for `git clone`/`npm install`, no route to any other container or service on the host
- Hard wall-clock timeout — a build that exceeds it gets killed, not left to run indefinitely

### 🔎 Zero-Config Detection
- Auto-detects `package.json` at the repo root, or inside `frontend/` for monorepos — Shipyard only ever builds static frontends, so detection is intentionally scoped to those two locations rather than scanning arbitrary folders
- Auto-detects the right install command from whichever lockfile is present (`npm ci`, `yarn install --frozen-lockfile`, `pnpm install --frozen-lockfile`, or a plain `npm install` if none exists)
- If `npm ci` fails specifically because the lockfile doesn't fully match `package.json` for this platform — a real, common gap when a lockfile is generated on Windows/Mac and built on Linux — it automatically falls back to `npm install` instead of hard-failing the build

### ⚙️ Per-Repo Build Overrides
- Optional install command, build command, and output directory can be set per repo, overriding auto-detection
- Output directory is validated against path traversal (`../`, `.git`) — a malicious override could otherwise copy the repo's embedded GitHub access token into the public deployment; this is blocked at the API level, not just discouraged

### 📡 Real-Time Everything
- Build logs stream to the browser over an authenticated Socket.io connection as the container produces them, not polled after the fact
- Raw container output is sanitized before it's ever stored or streamed: ANSI escape sequences and carriage-return-driven progress-spinner noise (the literal terminal control codes a tool like npm emits) are stripped and collapsed into clean, human-readable lines
- One-click copy of the full build log

### 🌐 Edge-Routed Subdomains
- A single wildcard Cloudflare DNS record plus a Cloudflare Worker replace what would otherwise be one DNS record per deployment
- The Worker resolves a subdomain to its S3 prefix via a Cloudflare KV lookup and proxies the request directly — new deployments go live the moment the KV entry is written, with no DNS propagation wait
- Old deployments and their KV entries are cleaned up on an hourly schedule, alongside any orphaned containers that somehow survived teardown

### 🔐 Real Multi-User Auth
- GitHub OAuth login, JWT access + refresh tokens
- Per-user, per-repo ownership checks on every repo/build/deployment endpoint
- Per-user concurrent-build and hourly-build-count quotas, enforced server-side

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express + TypeScript | REST API server |
| MySQL (mysql2) | Users, repos, builds, deployments |
| Redis + BullMQ | Build queue — a webhook enqueues a job, it never blocks the HTTP response waiting for a build to finish |
| Socket.io | Authenticated, per-build live log streaming |
| Dockerode | Container orchestration from code — builds are never shelled out to the Docker CLI directly |
| Passport + passport-github2 | GitHub OAuth |
| @octokit/rest | Repo listing, real webhook creation/removal on connect/disconnect |
| jsonwebtoken | Access + refresh token signing and verification |
| Zod | Request validation |
| node-cron | Hourly cleanup of expired deployments, stale build rows, and orphaned containers |
| strip-ansi | Central log sanitizer — strips escape codes and collapses spinner-frame noise before logs are ever persisted |
| express-rate-limit | Per-user, per-endpoint rate limiting |

### Frontend

| Technology | Purpose |
|---|---|
| React 19 + TypeScript + Vite | UI framework and build tooling |
| React Router DOM | Routing, nested layouts, auth guard |
| Zustand | In-memory auth state — access token and user, never persisted to storage |
| Tailwind CSS v4 | Utility-first styling |
| Framer Motion | Component and scroll-triggered animation |
| GSAP + ScrollTrigger | The landing page's scroll-driven build-pipeline scene |
| socket.io-client | Authenticated live log streaming, shared via React context |
| @number-flow/react | Animated number transitions |
| Lucide React | Icon set |
| Radix UI (checkbox, label, slot) | Headless primitives behind the shadcn-style `ui/` components |
| class-variance-authority + clsx + tailwind-merge | className composition for the `ui/` layer |

### Infrastructure

| Service | Purpose | Status |
|---|---|---|
| AWS EC2 (Docker + nginx + Certbot) | Backend host, build compute, reverse proxy, SSL | **Live** — `api-shipyard.shpit.uk` |
| AWS RDS (MySQL) | Primary relational store, private subnet, not publicly reachable | **Live** |
| AWS S3 | Static deployment output storage, public-read scoped to `deployments/*` only | **Live** — `shipyard-builds-dev` |
| Cloudflare Pages | Frontend hosting, auto-deploys from `main` | **Live** — `shipyard.shpit.uk` |
| Cloudflare Worker + KV | Edge routing — subdomain → S3 prefix lookup, replaces per-deployment DNS records | **Live** — `shipyard-router` / `shipyard_deployments` |
| Cloudflare (registrar + DNS) | `shpit.uk` domain | **Live** |
| Cloudflare Tunnel (named) | Local dev backend exposed at a permanent hostname for GitHub webhook/OAuth callback testing — dev only, not part of the production path | **Live**, dev-only — `shipyard-dev.shpit.uk` |
| Redis Cloud | BullMQ queue, shared with a separate project under a distinct key prefix | **Live** |

systemd manages the backend process on EC2 (auto-restart on crash, starts on boot); Let's Encrypt/Certbot auto-renews the API's TLS certificate.

---

## Architecture decisions worth knowing

- **One build, one container, always.** No container is ever reused across builds or across users. This is the actual security boundary the whole platform rests on, not a performance nicety — reuse would mean one user's build could theoretically observe leftover state from another's.

- **Build queue, not synchronous builds.** A webhook firing enqueues a BullMQ job and returns immediately; the HTTP response never blocks on a build actually running.

- **Builds run on the same host as the API, not a separate compute service.** Dockerode connects to the local Docker daemon on whatever machine the backend process is running on. There is no Fargate/ECS task-launch integration in the current implementation, despite an ECS cluster and ECR repo having been provisioned early on — that infrastructure exists but is unused by the running code. This is called out explicitly rather than left implied, since the tech stack badges could otherwise overstate it. A real next step, if this needed to scale past one server's worth of build capacity, would be to actually wire builds through the ECS/Fargate APIs instead of a local Docker socket.

- **Edge routing over per-deployment DNS.** The original design created one Cloudflare DNS CNAME record per deployment, all pointing at the same S3 website-endpoint root — which meant every subdomain actually served the bucket root, not its own deployment. This was caught in testing and replaced with a Cloudflare Worker + KV namespace: one wildcard DNS record total, with the Worker resolving each subdomain's actual S3 prefix from KV at request time.

- **`npm ci` failures get one, narrow fallback.** If `npm ci` fails for any reason other than a specific, detected lockfile-platform mismatch, it fails the build for real — no blanket catch-all retry. The fallback exists because a lockfile generated on Windows/Mac can legitimately omit Linux-only optional dependencies that a Linux build container needs; that's not a broken repo, it's a real cross-platform gap.

- **Build detection is intentionally narrow.** Only the repo root and a `frontend/` subfolder are ever checked for `package.json` — no recursive scanning of arbitrary directories, matching what the product actually deploys.

- **Output directory overrides are validated, not just accepted.** A user-supplied build override for the output directory is checked against path traversal and rejects anything resolving outside the build workspace or into `.git` — because the repo is cloned using a URL with an embedded, short-lived GitHub access token, and a malicious or careless override could otherwise cause that token to be copied into the public deployment.

- **Log capture is sanitized once, centrally.** Raw container stdout/stderr contains real terminal control sequences (cursor movement, carriage-return-driven progress spinners) that read as garbage if stored or streamed as-is. These are stripped and collapsed at the single point logs are captured from the container, not patched per call site.

- **Only one backend may run against the production Redis queue at a time.** BullMQ workers compete for jobs on a first-come basis; running a local dev backend against the same Redis instance as production causes jobs to be silently grabbed and failed by whichever process reaches them first, with no error surfaced to the user beyond a confusing stuck/failed build. This was hit directly during deployment testing and is the reason local dev defaults to a distinct queue prefix — see Running Locally below.

- **Least-privilege IAM, not "full access and hope."** The production IAM user is scoped to exactly three S3 actions (`PutObject`, `GetObject`, `DeleteObject`) plus `ListBucket`, on exactly one bucket — not the broader managed full-access policies used during early development. ECR and ECS full-access policies were removed entirely once it was confirmed the running code never calls either API.

---

## 📡 API Reference

All authenticated routes expect `Authorization: Bearer <accessToken>`.

### Authentication
```
GET    /auth/github               Begin GitHub OAuth flow
GET    /auth/github/callback      OAuth callback → redirects to the frontend with tokens
POST   /auth/refresh              Rotate refresh token → new access token
GET    /auth/me                   Get the current user from a valid access token
```

### Repos
```
GET    /repos/connected            List the current user's connected repos
GET    /repos/available            List the user's GitHub repos, with connected status
POST   /repos/connect              Connect a repo — creates a real GitHub webhook
DELETE /repos/:id                  Disconnect a repo — removes the GitHub webhook
PATCH  /repos/:id                  Set install/build command and output directory overrides
```

### Webhooks
```
POST   /webhooks/github            GitHub webhook receiver — HMAC signature verified, enqueues a build on push
```

### Builds
```
POST   /builds                     Manually trigger a build for a connected repo
GET    /builds/:id                 Single build's status, timestamps, error message
GET    /builds/repo/:repoId        Build history for a repo
```

### Deployments
```
GET    /deployments/repo/:repoId   Deployments for a repo, including the current live one
```

### Health
```
GET    /health                     Liveness check
```

---

## 🔧 Build Detection & Overrides

| Field | Auto-detected as | Override behavior |
|---|---|---|
| Root directory | Repo root, or `frontend/` if no root-level `package.json` exists | Not overridable — intentionally limited to these two locations |
| Install command | `npm ci` / `yarn install --frozen-lockfile` / `pnpm install --frozen-lockfile` / `npm install`, based on which lockfile is present | Settable per repo via `PATCH /repos/:id` |
| Build command | `npm run build` | Settable per repo |
| Output directory | `dist` | Settable per repo — rejects absolute paths and `../`/`.git` segments |

If `npm ci` is selected and fails specifically due to a package.json/package-lock.json mismatch for the current platform, Shipyard automatically retries with `npm install` and logs that this happened. Any other install failure — a genuinely broken repo, a missing dependency that doesn't exist on npm, a real syntax error — fails the build and surfaces the real error, with no further retry.

---

## 🔒 Security

- GitHub OAuth login; JWT access + refresh tokens
- Every repo/build/deployment endpoint checks that the resource actually belongs to the requesting user — no ownership check is assumed client-side only
- Webhook receiver verifies GitHub's HMAC signature before enqueueing anything
- Build containers: all Linux capabilities dropped, `no-new-privileges` set, isolated bridge network with no route to the host's other services, hard memory/CPU/process caps, hard wall-clock timeout
- Output directory overrides validated against path traversal to prevent the repo's embedded GitHub token from being copied into a public deployment
- Per-user concurrent-build and hourly-build-count quotas enforced server-side
- `trust proxy` correctly configured so rate limiting reads the real client IP behind a reverse proxy, not the proxy's own address
- Production IAM user scoped to `PutObject`/`GetObject`/`DeleteObject`/`ListBucket` on exactly one S3 bucket — no ECR, no ECS, no other buckets, no full-access managed policies
- Production database (RDS) is not publicly reachable — only accessible from the backend's own EC2 security group
- SSH to the backend server is restricted to a known IP, not open to the internet
- `.env` never committed, enforced via `.gitignore`

---

## 📁 Project Structure

```
shipyard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts                  Typed environment config
│   │   │   ├── db.ts                   MySQL pool
│   │   │   ├── redis.ts                Redis client, BullMQ-prefixed
│   │   │   ├── passport.ts             GitHub OAuth strategy
│   │   │   └── aws.ts                  S3 client
│   │   ├── middleware/
│   │   │   ├── auth.ts                 requireAuth (JWT verification)
│   │   │   ├── rateLimiter.ts          Per-user / per-endpoint limits
│   │   │   └── validate.ts             Zod request validation
│   │   ├── modules/
│   │   │   ├── auth/                   auth.routes.ts, auth.controller.ts, auth.service.ts, token.service.ts
│   │   │   ├── repos/                  repo.routes.ts, repo.controller.ts, repo.service.ts
│   │   │   ├── webhooks/               webhook.routes.ts, webhook.controller.ts, webhook.service.ts
│   │   │   ├── builds/                 build.routes.ts, build.controller.ts, build.service.ts
│   │   │   └── deployments/            deployment.routes.ts, deployment.controller.ts, deployment.service.ts
│   │   ├── services/
│   │   │   ├── buildRunner.service.ts   Dockerode: create/run/destroy build container
│   │   │   ├── buildQueue.service.ts    BullMQ queue + worker
│   │   │   ├── s3.service.ts            Upload build output
│   │   │   ├── dns.service.ts           Cloudflare KV route registration
│   │   │   ├── socket.service.ts        Socket.io JWT auth + log streaming
│   │   │   └── cleanup.service.ts       Scheduled removal of stale deployments/builds/containers
│   │   ├── utils/
│   │   │   └── logSanitizer.ts          Strips ANSI escapes, collapses spinner noise
│   │   ├── database/
│   │   │   └── init.sql                 MySQL schema
│   │   ├── app.ts                       Express app, middleware order, route mounting
│   │   └── server.ts                    HTTP server, Socket.io init, startup sequence
│   ├── docker/
│   │   └── entrypoint.sh                Build-runner container's actual build logic
│   └── Dockerfile                       Build-runner image
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.tsx          Scroll-driven build-pipeline scene + marketing sections
    │   │   ├── LoginPage.tsx
    │   │   ├── AuthCallback.tsx         GitHub OAuth token handoff
    │   │   ├── DashboardPage.tsx        Connected repos, last build status, live URLs
    │   │   ├── RepoPage.tsx             Build history, build settings overrides, disconnect
    │   │   ├── BuildPage.tsx            Live streamed logs, build metadata
    │   │   ├── DeploymentsPage.tsx      Deployments grouped by repo, current vs. historical
    │   │   └── SettingsPage.tsx         Account info, account-wide limits
    │   ├── components/
    │   │   ├── AppLayout.tsx            Authenticated shell
    │   │   ├── RequireAuth.tsx          Auth route guard
    │   │   ├── PipelineScene.tsx         The landing page's signature scroll scene
    │   │   ├── LogStream.tsx             Live streaming log viewer with copy button
    │   │   ├── BuildStatusBadge.tsx
    │   │   ├── MagneticButton.tsx
    │   │   └── ui/                       button.tsx, input.tsx, checkbox.tsx, label.tsx, card.tsx
    │   ├── context/
    │   │   └── SocketContext.tsx         Authenticated Socket.io connection
    │   ├── store/
    │   │   └── authStore.ts              Zustand — in-memory access token + user
    │   ├── hooks/
    │   │   └── useScrollPipeline.ts       GSAP ScrollTrigger setup for the pipeline scene
    │   └── lib/
    │       ├── api.ts                    Every backend call, 401 → refresh → retry
    │       └── utils.ts                  cn() helper, relative time, short SHA formatting
    └── vite.config.ts
```

---

## 🗄️ MySQL Schema

| Table | Purpose |
|---|---|
| `users` | GitHub account, avatar, GitHub OAuth access token (server-side only, never returned to the client) |
| `refresh_tokens` | Hashed refresh tokens, expiry, revocation |
| `repos` | Connected repos — webhook id, default branch, and optional install/build command + output directory overrides |
| `builds` | Every build — commit, branch, status, log, error message, timestamps |
| `deployments` | Every successful build's deployment — subdomain, S3 prefix, current/historical flag |

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- Docker Desktop (build containers, and local MySQL)
- A GitHub OAuth App
- An AWS account (S3)
- A Redis instance (Redis Cloud or local) — **use a different `REDIS_QUEUE_PREFIX` than production** (e.g. `shipyard-dev`) if pointing at the same Redis instance production uses, or two backends will race for the same queued jobs
- A Cloudflare account with a domain, a Worker + KV namespace set up for edge routing, and a named Cloudflare Tunnel for exposing your local backend to GitHub's webhook/OAuth callback

### 1. Clone and install
```bash
git clone https://github.com/Abdallah-khatib-7/Shipyard.git
cd Shipyard
```

### 2. Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```
PORT=4000

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://your-tunnel-hostname/auth/github/callback
GITHUB_WEBHOOK_SECRET=...

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=...

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=shipyard

REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
REDIS_QUEUE_PREFIX=shipyard-dev

CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_KV_NAMESPACE_ID=...
CLOUDFLARE_KV_API_TOKEN=...

FRONTEND_URL=http://localhost:5173
```

```bash
docker run -d --name shipyard-mysql -e MYSQL_ROOT_PASSWORD=devpassword -e MYSQL_DATABASE=shipyard -p 3306:3306 mysql:8
mysql -h localhost -u root -p shipyard < src/database/init.sql
npm run dev
# Shipyard backend listening on 4000
```

### 3. Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev
# App running on http://localhost:5173
```

### 4. Exposing your local backend for real webhook/OAuth testing
GitHub needs to reach your backend over the public internet, which `localhost` can't do. Run a named Cloudflare Tunnel pointed at your local backend, and use that hostname for `GITHUB_CALLBACK_URL` and your GitHub OAuth App's callback URL:
```bash
cloudflared tunnel run <your-tunnel-name>
```

### 5. Build-runner image
The image used by the build runner needs to exist locally on whatever machine runs the backend:
```bash
docker build -t shipyard-build-runner backend/
```

---

## Known limitations / honest caveats

These are deliberate, documented scope decisions — not oversights.

- **No custom domains.** Only `*.shpit.uk` subdomains are supported. Cloudflare's SSL-for-SaaS custom hostname feature is now available on its Free plan and was evaluated, but it carries a real per-domain cost ($2/month) and meaningful additional complexity (ownership verification, per-hostname SSL provisioning, Worker routing changes) that doesn't fit Shipyard's actual positioning as free hosting for people without a domain.
- **Builds run on a single EC2 host, not real elastic compute.** An ECS cluster and ECR repository were provisioned early in the project, but the running code never calls either API — Dockerode talks to the local Docker daemon on the same box as the API server. This is a real capacity ceiling (one server's worth of concurrent build throughput, and a shared fate between "API is up" and "builds can run"), not an oversight in the README.
- **No PR/branch preview deployments.** Every push to the connected branch builds and deploys; there's no separate preview-URL-per-pull-request workflow yet.
- **No one-click rollback.** Old build output remains in S3 and old deployment rows remain in the database, but there's no endpoint or UI to re-point a subdomain at a previous deployment.
- **No build caching between deploys.** Every build runs `npm ci`/`npm install` from scratch in a fresh container — correct for isolation guarantees, slower than a platform that caches `node_modules` between builds on the same repo.
- **Shared Redis instance.** The BullMQ queue runs on a Redis instance shared with a separate project, isolated by key prefix rather than a dedicated instance. Isolation held up in practice, but running two *backends* (not just two prefixes) against it at once caused real, confusing job-racing during deployment — documented above under Architecture Decisions.
- **`t3.micro` is a genuine memory constraint.** With MySQL moved to RDS, the backend server has real headroom for build containers, but it's still a 1GB instance — a build with an unusually large `npm install`/build step could still hit the ceiling. `t3.small` is the documented next step if that becomes a recurring problem rather than an edge case.

---

## 👨‍💻 About

I'm Abdallah Khatib, a Computer Science graduate from Lebanese International University. Shipyard is a deliberate exercise in building the genuinely hard part of a deployment platform — untrusted code execution, container isolation, and edge routing — and then actually deploying it to real infrastructure, rather than another CRUD app with a nice UI on top left running on a laptop.

Built alongside:
- **Rakiz** — a multi-currency digital wallet and payment-splitting platform with double-entry bookkeeping and an AI fraud queue
- **PharmaCare** — pharmacy management with AI-powered drug interaction checking
- **Tawla** — multi-tenant SaaS restaurant POS with real-time Socket.io and an AI upsell engine
- **AceIt** — AI interview coaching platform with CV scoring, mock interviews, and skill quizzes

📧 abdallah.khatib2003@gmail.com

---

## 📄 License

This project is for portfolio and demonstration purposes. All rights reserved © 2026 Abdallah Khatib.