# Employee Management System

A digital replacement for manual HR record-keeping: employee data, attendance, and PDF/Excel reports.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Hook Form + Yup, React Router |
| Backend  | ASP.NET Core 10 Web API (Clean Architecture), EF Core 10, JWT auth via httpOnly cookies, BCrypt |
| Database | MySQL 8 |

## Repository layout

```
backend/
  src/
    EMS.Domain          Entities and enums. No dependencies.
    EMS.Application     DTOs, service interfaces, business logic.
    EMS.Infrastructure  EF Core (MySQL), repositories, token/password services, report generators.
    EMS.Api             Controllers, middleware, DI/config. Composition root.
frontend/
  src/
    components/         Reusable UI (forms, fields, layout)
    pages/              Route-level screens
    lib/                Redux store, slices, async-thunk features, typed hooks
    providers/          Store + auth-session providers
    types/  utils/
```

## Prerequisites

- .NET SDK 10
- Node.js 20+
- MySQL 8

## Environment variables

### Backend (`backend/src/EMS.Api`)

Never commit these. In development use .NET user-secrets; in production use real environment variables
(`__` replaces `:` in the key name).

| Key (config path)               | Env var form                     | Purpose                                     |
| ------------------------------- | -------------------------------- | ------------------------------------------- |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` | MySQL connection string          |
| `Jwt:AccessTokenSecret`         | `Jwt__AccessTokenSecret`         | Signing key for access tokens (32+ chars)   |
| `Jwt:RefreshTokenSecret`        | `Jwt__RefreshTokenSecret`        | Signing key for refresh tokens (32+ chars, different from access) |
| `Cors:AllowedOrigins`           | `Cors__AllowedOrigins__0`        | Frontend origin(s) allowed to call the API  |
| `Seed:AdminEmail` / `Seed:AdminPassword` | `Seed__AdminEmail` ...  | Initial admin account created on first run  |

```bash
cd backend/src/EMS.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=ems_db;User=ems_user;Password=<password>"
dotnet user-secrets set "Jwt:AccessTokenSecret"  "<random 64 chars>"
dotnet user-secrets set "Jwt:RefreshTokenSecret" "<another random 64 chars>"
```

Generate a secret: `openssl rand -base64 48`

### Frontend (`frontend/.env`)

| Key                     | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `VITE_API_PROXY_TARGET` | Dev only. Backend URL the Vite dev server proxies `/api` to (default `http://localhost:5080`) |

## Running locally

```bash
# API  -> http://localhost:5080
cd backend && dotnet run --project src/EMS.Api

# Web  -> http://localhost:5173
cd frontend && npm install && npm run dev
```

## Git workflow

| Branch                     | Purpose                                |
| -------------------------- | -------------------------------------- |
| `main`                     | Production                             |
| `staging`                  | Pre-production (created from `main`)   |
| `dev`                      | Integration (created from `staging`)   |
| `feature/<name>`           | New work, branched from `dev`          |
| `fix/<name>`               | Bug fixes, branched from `dev`         |
| `chore/<name>`, `docs/...` | Tooling and docs                       |

Flow: `feature/*` -> `dev` -> `staging` -> `main` (pull requests at each step).
# ems-task
