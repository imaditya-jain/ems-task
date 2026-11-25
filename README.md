# Employee Management System

A web application that replaces manual HR record-keeping: it manages employee data, tracks daily attendance, records
performance reviews, and generates PDF / Excel reports and workforce analytics.

Built as a full-stack assignment: **React + TypeScript** frontend, **ASP.NET Core Web API** backend, **MySQL** database.

## Features

| Area | What you can do |
| ---- | --------------- |
| **Login & security** | Email/password sign-in, httpOnly-cookie JWT sessions with silent refresh and refresh-token rotation, login rate limiting, logout that revokes the session |
| **Employees** | Add, edit, view and delete one employee; add many at once by CSV import (all-or-nothing, row-level errors); delete many at once; server-side search, department/status filters, sorting and paging |
| **Departments** | Create, rename and delete departments (a department that still has employees cannot be deleted) |
| **Attendance** | Mark a whole day at once (Present, Late, Half Day, Leave, Absent, with notes), correct past records, monthly attendance history per employee |
| **Reports** | PDF **and** Excel for the employee directory, departments, attendance and salary data |
| **Bonus: analytics** | Hiring trend analysis, department growth tracking, attendance pattern reports, dashboard with live numbers |
| **Bonus: performance** | Quarterly reviews (quality, productivity, teamwork), performance metrics and charts, PDF/Excel export |

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Hook Form + Yup, React Router, Recharts, React Toastify |
| Backend  | ASP.NET Core 10 Web API, EF Core 10, JWT (httpOnly cookies), BCrypt.Net, QuestPDF, ClosedXML |
| Database | MySQL 8 (Oracle `MySql.EntityFrameworkCore` provider, EF Core migrations) |

## Architecture

The backend follows Clean Architecture. Dependencies point inward: the Api layer knows about everything, the Domain layer
knows about nothing.

```
EMS.Api ──────────▶ EMS.Application ──────────▶ EMS.Domain
   │                      ▲
   └──▶ EMS.Infrastructure ┘   (implements the interfaces declared in Application)
```

| Project | Responsibility |
| ------- | -------------- |
| `EMS.Domain` | Entities and enums. No dependencies. |
| `EMS.Application` | DTOs and validation rules, service interfaces and business logic, repository interfaces. Never touches EF Core or HTTP. |
| `EMS.Infrastructure` | EF Core `DbContext`, configurations and migrations, repositories, JWT and BCrypt implementations, PDF/Excel generators. |
| `EMS.Api` | Controllers, middleware (error handling), authentication/CORS/rate-limiting setup. The composition root. |

Request flow: `Controller` → `Service` (business rules) → `Repository` (EF Core) → MySQL. Controllers contain no logic.

### Repository layout

```
backend/
  EmployeeManagement.sln
  src/EMS.Domain | EMS.Application | EMS.Infrastructure | EMS.Api
frontend/
  src/
    components/     UI grouped by purpose: auth, common, fields, forms, layout, analytics, ...
    pages/          Route-level screens (each is lazy-loaded as its own chunk)
    lib/
      store.ts, hooks.ts      Redux store and typed hooks
      features/*.feature.ts   Async thunks (API calls) per feature
      slices/*.slice.ts       Reducers per feature
      api.ts, auth-fetch.ts   Request helper and the silent-refresh fetch wrapper
    providers/      Store and auth-session providers
    types/  utils/
```

## Authentication design

- **Login** returns no tokens in the body. The server sets two `httpOnly`, `SameSite=Strict` cookies:
  a 15-minute **access token** (sent on every request) and a 7-day **refresh token** (path-scoped to `/api/v1/auth`, so it
  is only sent to the auth endpoints).
- **Tokens are never stored in Redux or localStorage**, so page JavaScript cannot read them.
- **Refresh-token rotation:** every refresh issues a new refresh token and invalidates the old one. Only a SHA-256 hash of
  the current refresh token is stored. Presenting an already-rotated token revokes the session.
- **Silent refresh:** on a `401`, `authFetch` calls the refresh endpoint once (shared by all concurrent requests),
  then retries the original request once.
- **Session restore:** on app start the frontend asks `GET /auth/me`, so a page reload keeps you signed in. Route guards wait
  for that check (`initialized`) before deciding to redirect.
- **Passwords** are hashed with BCrypt (work factor 12). Login errors are generic and login is rate-limited
  (5 attempts per minute per IP).
- **Cookies are `Secure` over HTTPS.** Behind a TLS-terminating proxy the API reads `X-Forwarded-Proto` / `X-Forwarded-For`
  (trusted from loopback proxies only by default).

## Data model

| Table | Notes |
| ----- | ----- |
| `users` | Sign-in accounts (Admin / HR). Stores the refresh-token hash and expiry. Unique email. |
| `departments` | Unique name. |
| `employees` | Unique employee code and email. Belongs to a department (restrict delete). Status Active / Inactive. |
| `attendances` | One row per employee per day (unique `EmployeeId + Date`). Cascades when an employee is deleted. |
| `performance_reviews` | One review per employee per quarter (unique `EmployeeId + Year + Quarter`). Cascades with the employee. |

Dates are stored as UTC; date-only fields (birth, joining, attendance) are stored as `DATE`.

## API overview

All endpoints are under `/api/v1`, return `{ success, message?, data? }` or `{ success: false, error, errors? }`, and require
a signed-in session except `auth/login`, `auth/refresh-token`, `auth/logout` and `health`.

| Area | Endpoints |
| ---- | --------- |
| Auth | `POST /auth/login` · `POST /auth/refresh-token` · `POST /auth/logout` · `GET /auth/me` |
| Departments | `GET /departments?search` · `GET /departments/{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` |
| Employees | `GET /employees?search&departmentId&status&sortBy&descending&page&pageSize` · `GET /employees/options` · `GET /employees/{id}` · `POST /employees` · `POST /employees/bulk` · `PUT /{id}` · `DELETE /{id}` · `POST /employees/bulk-delete` |
| Attendance | `GET /attendance?date&departmentId&search` (daily sheet) · `POST /attendance` (mark one or many) · `GET /attendance/employees/{id}?month=yyyy-MM` |
| Reports | `GET /reports/{employee-directory\|departments\|attendance\|salary\|performance}?format=pdf\|excel` plus filters `departmentId`, `status`, `from`, `to`, `year`, `quarter` |
| Analytics | `GET /analytics/overview` · `/analytics/hiring-trend?months` · `/analytics/department-growth?months` · `/analytics/attendance-patterns?from&to&departmentId` |
| Performance | `GET /performance` · `GET /performance/metrics?year&quarter&departmentId` · `GET /performance/{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` |
| Health | `GET /health` |

In Development the OpenAPI document is served at `/openapi/v1.json`.

## Prerequisites

- .NET SDK 10
- Node.js 20+
- MySQL 8
- (one-time) the EF Core CLI: `dotnet tool install --global dotnet-ef --version 10.0.15`

## Getting started

### 1. Create the database

```sql
CREATE DATABASE ems_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ems_user'@'localhost' IDENTIFIED BY '<choose-a-password>';
GRANT ALL PRIVILEGES ON ems_db.* TO 'ems_user'@'localhost';
```

### 2. Configure the backend

Never commit secrets. In development use .NET user-secrets:

```bash
cd backend/src/EMS.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=ems_db;User=ems_user;Password=<password>"
dotnet user-secrets set "Jwt:AccessTokenSecret"  "$(openssl rand -base64 48)"
dotnet user-secrets set "Jwt:RefreshTokenSecret" "$(openssl rand -base64 48)"
dotnet user-secrets set "Seed:AdminEmail" "admin@yourcompany.com"
dotnet user-secrets set "Seed:AdminPassword" "<a strong password>"
```

### 3. Run

```bash
# API -> http://localhost:5080  (applies migrations and creates the admin on first start in Development)
cd backend && dotnet run --project src/EMS.Api

# Web -> http://localhost:5173  (proxies /api to the API)
cd frontend && cp .env.example .env && npm install && npm run dev
```

Sign in with the `Seed:AdminEmail` / `Seed:AdminPassword` you set.
The admin is only created when no users exist yet.

### Environment variables

Configuration keys use `:` in files and user-secrets, and `__` in real environment variables
(for example `Jwt__AccessTokenSecret`).

**Backend**

| Key | Required | Purpose |
| --- | -------- | ------- |
| `ConnectionStrings:DefaultConnection` | yes | MySQL connection string |
| `Jwt:AccessTokenSecret` | yes | Signs access tokens. 32+ characters. |
| `Jwt:RefreshTokenSecret` | yes | Signs refresh tokens. 32+ characters and **different** from the access secret (validated on startup). |
| `Cors:AllowedOrigins` | yes in production | Frontend origin(s), e.g. `Cors__AllowedOrigins__0=https://hr.example.com`. Defaults to `http://localhost:5173`. |
| `Seed:AdminEmail`, `Seed:AdminPassword` | first run | Creates the first admin when the `users` table is empty |
| `Jwt:AccessTokenMinutes`, `Jwt:RefreshTokenDays` | no | Token lifetimes (default 15 minutes / 7 days) |

**Frontend** (`frontend/.env`)

| Key | Purpose |
| --- | ------- |
| `VITE_API_PROXY_TARGET` | Development only. Where the Vite dev server proxies `/api` (default `http://localhost:5080`). |

## CSV import format

Employees → **Import CSV** (a template can be downloaded in the dialog). Maximum 200 rows per file.

```
employeeCode,firstName,lastName,email,phone,dateOfBirth,gender,departmentName,designation,joiningDate,salary,status
EMP-1001,Asha,Patil,asha@company.com,+91 98765 43210,1995-04-12,Female,Engineering,Software Engineer,2022-06-01,85000,Active
```

Dates are `yyyy-MM-dd`, gender is `Male|Female|Other`, status is `Active|Inactive` (optional, defaults to Active), and the
department must already exist. If any row is invalid, nothing is imported and every problem is listed with its row number.

## Business rules

- Employees must be at least 18 and cannot join before turning 18. Employee code and email are unique.
- Attendance can only be marked for active employees and not for future dates.
- One attendance record per employee per day; re-marking a day updates the record.
- Attendance % = (Present + Late + ½ × Half Day) ÷ (marked days − Leave).
- A review's overall rating is the average of its three scores. Reviews cannot be created for future quarters.
- Leavers should be set to **Inactive** rather than deleted so their history stays available to reports.

## Production notes

```bash
# Apply database migrations (they are NOT applied automatically outside Development)
cd backend && dotnet ef database update -p src/EMS.Infrastructure -s src/EMS.Api

# Publish the API and build the web app
dotnet publish src/EMS.Api -c Release -o out
cd ../frontend && npm ci && npm run build      # static files in frontend/dist
```

- Serve `frontend/dist` and the API **from the same origin** (for example Nginx serving the static files and proxying
  `/api/` to Kestrel). Auth cookies are `SameSite=Strict`, so a separate domain for the API would not receive them.
  Forward `X-Forwarded-Proto` and `X-Forwarded-For`, and fall back to `index.html` for client-side routes.
- Set the secrets as environment variables, use HTTPS, and set `Cors__AllowedOrigins__0` to the public site URL.
- QuestPDF is used under its Community licence (free for individuals and companies under USD 1M annual revenue).

## Known limitations

- There are no automated tests yet; the features were verified manually and with scripted API/browser checks.
- Roles (Admin / HR) are stored but every signed-in user has the same permissions.
- Attendance records a daily status only, with no check-in / check-out times.
- Headcount history is derived from joining dates because there is no leaving date.
- Employee codes are entered by the user rather than generated.
- If two requests create the same employee code or email at the same instant, the database's unique index rejects one and
  the user sees a generic error instead of a specific message.

## Git workflow

| Branch | Purpose |
| ------ | ------- |
| `main` | Production |
| `staging` | Pre-production (created from `main`) |
| `dev` | Integration (created from `staging`) |
| `feature/<name>` | New work, branched from `dev` |
| `fix/<name>` | Bug fixes, branched from `dev` |
| `chore/<name>`, `docs/<name>` | Tooling and documentation |

Flow: `feature/*` → `dev` → `staging` → `main`, with a pull request at each step.
Delivered so far: `feature/auth`, `departments`, `employees`, `attendance`, `reports`, `analytics`.
