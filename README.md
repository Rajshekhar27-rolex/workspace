# Client Request Desk

A multi-tenant web application for local businesses to review customer requests, track lifecycle statuses, and convert qualified requests into scheduled work items with human confirmation.

---

## 1. Architecture & Key Decisions

- **Multi-Tenant Isolation**: Built with strict workspace isolation. The frontend never dictates or provides `workspaceId`. Identity is resolved strictly server-side through the authenticated user's database record.
- **Database Engine & Relational Constraints**: SQLite managed with Prisma ORM. Concurrency deduplication is enforced by a database-level `@unique([requestId])` constraint on `WorkItem`.
- **Atomic Operations**: State transitions, work item creation, and audit activity logging execute within an atomic `prisma.$transaction`.
- **Validation**: Runtime and compile-time type safety powered by Zod schemas.
- **Lightweight Dependencies**: Plain responsive CSS with CSS variables and flexbox/grid. No heavy UI or CSS frameworks.

---

## 2. Authentication Mechanism & Limitations

### Mechanism
The application implements a lightweight, deterministic authentication mechanism designed for local business multi-tenant evaluation:
- Seeded users represent operators across distinct business workspaces (e.g., Alice at *Apex Auto Repair* and Bob at *Bright Horizon Cleaning*).
- Authentication is passed via standard headers:
  - `x-user-id: <user_uuid>`, OR
  - `Authorization: Bearer <user_uuid>`
- The backend authentication middleware (`server/src/middleware/auth.ts`):
  1. Extracts the credential identifier.
  2. Queries the database for the user and their associated workspace.
  3. Rejects invalid or missing credentials with HTTP `401 Unauthorized`.
  4. Populates `req.user = { id, name, email, workspaceId, workspaceName }`.
  5. **Completely ignores** any client-submitted `workspaceId` headers, query parameters, or request bodies.

### Endpoints
- `GET /api/auth/users`: Lists available seeded users to enable one-click workspace switching in the UI.
- `POST /api/auth/login`: Accepts `{ userId }` or `{ email }` and returns `{ user, token }`.
- `GET /api/auth/me`: Returns the authenticated user's profile and verified workspace.

### Limitations & Production Considerations
- **No Password Hashing / Salt**: The mock auth uses deterministic user IDs/emails rather than bcrypt-hashed passwords. In a production environment, this would be replaced with Argon2/bcrypt password hashing, sessions, or OAuth 2.0 / OIDC (e.g., Auth0, WorkOS).
- **Stateless Bearer Tokens**: Tokens are currently user IDs rather than cryptographically signed JWTs or opaque encrypted session cookies with expiration and rotation.
- **Role-Based Access Control (RBAC)**: Users are currently scoped to their workspace with equal privileges. In production, roles (e.g., `ADMIN`, `TECHNICIAN`, `VIEWER`) would enforce granular permission levels within each workspace.

---

## 3. Workspace Isolation Guarantees

1. **Zero Client Trust**: All mutations and queries filter by `where: { workspaceId: req.user.workspaceId }`.
2. **Tenant Probe Defense**: Accessing an ID that exists in another workspace produces `null` from the database query and responds with **`404 Not Found`** rather than `403 Forbidden`, preventing attackers from enumerating resources across tenants.
3. **Relational Integrity**: Work items and activities are constrained to the same workspace as their parent request.

---

## 4. Development & Testing Commands

```bash
# 1. Dependency Installation
npm install                 # Install dependencies across all workspaces

# 2. Database Migrations & Seeding
npm run db:migrate          # Apply Prisma migrations to SQLite dev database
npm run db:seed             # Seed 2 workspaces, users, requests, and activity logs

# 3. Development
npm run dev                 # Run both backend (port 3001) and frontend (port 5173) concurrently
npm run dev:server          # Run Express backend with hot reloading
npm run dev:client          # Run Vite React frontend

# 4. Testing & Type Checks
npm test                    # Run all backend and frontend test suites
npm run test:backend        # Run Supertest + Vitest backend test suite
npm run test:frontend       # Run React Testing Library + Vitest frontend test suite
npm run typecheck           # Run TypeScript compiler checks across all workspaces

# 5. Production Build
npm run build               # Build client and server bundles
npm run start               # Launch the compiled Express production server
```

---

## 5. Seeded Accounts for Testing

| Workspace | User | Email |
| :--- | :--- | :--- |
| **Apex Auto Repair** | Alice Apex | `alice@apexauto.com` |
| **Bright Horizon Cleaning** | Bob Bright | `bob@brighthorizon.com` |
