# AGENTS.md — Client Request Desk

## 1. Project Purpose
The **Client Request Desk** is a production-style, multi-tenant web application designed for local businesses. Team members receive customer requests, review them, track their status, and convert approved requests into scheduled work items.

Core functional objectives:
- **Multi-Tenant Workspace Support**: Manage customer requests across distinct business workspaces with strict isolation. Data belonging to one workspace must never be visible or modifiable by another.
- **Request Lifecycle**: Track requests through defined statuses (`NEW` → `QUALIFIED` → `CLOSED`).
- **Human-Confirmed Conversion**: Qualified requests can be converted into scheduled work items only after explicit user confirmation in the interface.
- **Activity Auditing**: Record chronological activity entries indicating who performed each action and when.
- **High Reliability & Usability**: Responsive interface built with plain CSS, comprehensive validation, database-level integrity, and automated test coverage.

Scope context: Junior full-stack developer assignment (~6–8 hours effort). Prioritize clarity, safety, correctness, and clean engineering over speculative over-engineering.

---

## 2. Technology Stack

- **Frontend**: React 18+, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: SQLite, Prisma ORM
- **Validation**: Zod (shared schemas for runtime and compile-time type safety)
- **Styling**: Plain responsive CSS (CSS variables, Flexbox/Grid, mobile-responsive, no heavy component libraries)
- **Backend Testing**: Vitest, Supertest
- **Frontend Testing**: Vitest, React Testing Library, jsdom
- **Version Control**: Git with conventional, incremental commits

---

## 3. Architecture Rules

1. **Separation of Concerns**:
   - The repository is organized into `server/` (API, database, domain logic) and `client/` (UI, components, state management).
   - Routes handle HTTP parsing and response formatting.
   - Controllers/Services execute business logic and database queries.
   - The database layer enforces relational constraints and atomicity.
2. **Zero Client Trust for Multi-Tenancy**:
   - The client application **must never** pass `workspaceId` in request bodies, query parameters, or client headers.
   - The backend resolves the authenticated user from credentials (`x-user-id` or bearer token) and extracts `workspaceId` directly from the user's verified database record.
3. **No External AI APIs**:
   - The application does not rely on third-party AI APIs (OpenAI, Anthropic, Gemini, etc.).
   - Any assistant features must be deterministic, heuristic/rule-based, and advisory only (never mutating data without explicit confirmation).
4. **Clean Dependencies**:
   - Do not install heavy CSS frameworks (Tailwind, Bootstrap, MUI). Use plain, maintainable, responsive CSS.

---

## 4. Coding Conventions

- **Language**: TypeScript throughout the entire stack with strict mode enabled (`strict: true` in `tsconfig.json`).
- **No `any`**: Avoid `any` types. Use explicit interfaces, types, or Zod-inferred types (`z.infer<typeof Schema>`).
- **Error Handling**:
  - Backend: Handled centrally using an Express error-handling middleware. Do not let unhandled promise rejections crash the server.
  - Frontend: All network requests must have user-facing error states and loading states.
- **Naming Conventions**:
  - Files: `PascalCase.tsx` for React components, `camelCase.ts` for utilities, services, and routes.
  - Variables and Functions: `camelCase`.
  - Constants and Enums: `UPPER_SNAKE_CASE`.
  - Database Models: `PascalCase` singular (e.g., `CustomerRequest`, `WorkItem`).
- **Documentation**:
  - Preserve comments and docstrings.
  - Document assumptions, route parameters, and complex business logic clearly.

---

## 5. Workspace Isolation Rules (CRITICAL)

Workspace data isolation is the paramount security requirement of this application:

1. **Backend-Enforced Identity**:
   - `req.user` is populated by the authentication middleware: `{ id: string, name: string, workspaceId: string }`.
   - Never trust client-supplied workspace identifiers.
2. **Mandatory Query Scoping**:
   - Every single Prisma query that reads, updates, or deletes workspace-owned data (`CustomerRequest`, `WorkItem`, `ActivityLog`) must include `workspaceId: req.user.workspaceId` in its `where` clause.
3. **ID Tampering Defense**:
   - If a user in Workspace A submits a request targeting an ID belonging to Workspace B (e.g., `GET /api/requests/:workspaceB_RequestId`), the query must yield `null`.
   - The server must respond with **`404 Not Found`**, NOT `403 Forbidden`. This prevents cross-tenant resource enumeration and existence probing.
4. **Relational Isolation**:
   - Child records (`WorkItem`, `ActivityLog`) must always link back to the verified parent request and workspace.

---

## 6. API Conventions

- **Base URL**: `/api`
- **Standard HTTP Methods**:
  - `GET /api/requests`: List requests in the user's workspace (supports `?status=NEW|QUALIFIED|CLOSED`).
  - `POST /api/requests`: Create a new request in the user's workspace.
  - `GET /api/requests/:id`: Fetch single request details with its work item and activity timeline.
  - `PATCH /api/requests/:id`: Update request details or status.
  - `POST /api/requests/:id/convert`: Convert a `QUALIFIED` request to a `WorkItem`.
  - `GET /api/auth/users`: List seeded users/workspaces for switching contexts.
  - `GET /api/auth/me`: Get current authenticated user and workspace profile.
- **HTTP Status Codes**:
  - `200 OK`: Successful read or update.
  - `201 Created`: Successful resource creation or conversion.
  - `400 Bad Request`: Validation failure or illegal status transition.
  - `401 Unauthorized`: Missing, invalid, or unauthenticated user context.
  - `404 Not Found`: Resource does not exist or belongs to another workspace.
  - `409 Conflict`: Resource already converted (duplicate conversion attempt).
  - `500 Internal Server Error`: Unexpected server errors.
- **Standard Error Payload**:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable explanation.",
      "details": []
    }
  }
  ```

---

## 7. Validation Rules

- **Validation Library**: Zod on both backend and frontend.
- **Customer Request Validation**:
  - `customerName`: String, trimmed, min 2, max 100 characters.
  - `customerEmail`: String, valid email format.
  - `customerPhone`: Optional string, trimmed.
  - `requestedService`: String, trimmed, min 2, max 150 characters.
  - `details`: Optional string, max 1000 characters.
  - `status`: Enum (`NEW`, `QUALIFIED`, `CLOSED`). Default is `NEW`.
- **Status Transition Constraints**:
  - Only requests with status `QUALIFIED` can be converted into a `WorkItem`.
  - Conversion attempts on `NEW` or `CLOSED` requests must be rejected immediately with HTTP 400.
- **Work Item Conversion Validation**:
  - `scheduledDate`: Valid ISO-8601 date string, must not be in the past.
  - `notes`: Optional string, max 500 characters.

---

## 8. Database Rules

- **Database Engine**: SQLite with Prisma ORM.
- **Atomic Operations**:
  - Work item creation, request status updates, and activity logging must execute within an atomic transaction (`prisma.$transaction`).
  - If any part fails, the entire transaction rolls back.
- **Deduplication Guarantee**:
  - `WorkItem` must declare `@unique([requestId])` in `schema.prisma`.
  - Duplicate conversion requests must be stopped by the unique constraint at the database level and return `409 Conflict`.
- **Database Seeding**:
  - Seeder (`prisma/seed.ts`) must populate:
    - 2 Workspaces (e.g., "Apex Auto Repair", "Bright Horizon Cleaning").
    - 1 User per workspace (e.g., "Alice Apex", "Bob Bright").
    - Minimum 4 sample customer requests per workspace spanning `NEW`, `QUALIFIED`, and `CLOSED`.
    - Activity log entries for sample requests.

---

## 9. Testing Requirements

- **Backend Integration Tests (Vitest + Supertest)**:
  - **Isolation**: Verify User 1 cannot view, edit, or convert requests from Workspace 2.
  - **Security**: Verify cross-workspace ID tampering returns 404.
  - **Conversion Rules**: Verify non-QUALIFIED requests cannot be converted (HTTP 400).
  - **Deduplication**: Verify repeated conversion requests return HTTP 409 and do not create duplicate database records.
  - **Atomicity**: Verify failure in activity creation rolls back work item creation.
  - **Validation**: Verify invalid payloads return HTTP 400 with descriptive error messages.
- **Frontend Component & Interaction Tests (Vitest + RTL)**:
  - **Conversion Confirmation Flow**: Verify modal displays customer name, requested service, and scheduled date picker.
  - **Form Validation**: Verify client-side error states when submitting empty or invalid data.
  - **Confirmation Execution**: Verify submitting the confirmation triggers API call and updates UI.

---

## 10. Security Requirements

- **Secrets Management**: No API keys, passwords, or tokens committed to version control. Maintain `.env.example`.
- **Input Sanitization**: Strip dangerous inputs, validate formats with Zod, and prevent injection via Prisma parameterized queries.
- **Tenant Probe Prevention**: Consistent 404 responses for unauthorized cross-workspace queries to prevent timing attacks or tenant enumeration.
- **Safe Actions**: Dangerous or significant state transitions (such as work item conversion) require explicit human confirmation on the client side.

---

## 11. Commands for Development, Testing, and Production Build

```bash
# 1. Dependency Installation
npm install                 # Install root dependencies
npm run install:all         # Install all dependencies across root, server, and client

# 2. Database Setup & Seeding
npm run db:migrate          # Apply Prisma migrations to SQLite database
npm run db:seed             # Seed workspaces, users, requests, and activity logs

# 3. Development
npm run dev                 # Run both backend (Express) and frontend (Vite) concurrently

# 4. Testing
npm test                    # Run all backend and frontend test suites
npm run test:backend        # Run backend Supertest test suite
npm run test:frontend       # Run frontend React Testing Library test suite

# 5. Production Build
npm run build               # Build TypeScript server and Vite client distribution
npm run start               # Launch the production Express server
```

---

## 12. Definition of Done (DoD)

A milestone or feature is complete only when:
1. All business logic meets the acceptance criteria defined in the milestone plan.
2. Workspace isolation is verified (no cross-tenant leakage or mutation).
3. Database constraints enforce data integrity (e.g., unique constraints on conversion).
4. Automated tests are written and passing with green status (`npm test`).
5. Responsive UI conforms to usability requirements with clear loading, empty, validation, and error states.
6. TypeScript compiles with zero errors and no `any` hacks.
7. Git commit messages follow conventional commit guidelines and represent clear, logical development steps.
