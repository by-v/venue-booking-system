# Tasks

## 1. Setup Project Structure

- [ ] 1.1 Initialize Next.js project with App Router and TypeScript strict mode (verify `npm run build` succeeds without errors)
- [ ] 1.2 Verify project contains `next.config.js`, `tsconfig.json`, and `package.json` in root directory

## 2. Dependencies

- [ ] 2.1 Add dependencies: next, better-auth, typescript, drizzle-orm, pg, zod, vitest (verify `npm install` completes without errors)
- [ ] 2.2 Verify `npm ls` shows all dependencies installed

## 3. Configuration

- [ ] 3.1 Create `drizzle.config.ts` with PostgreSQL connection setup (verify file exists and contains connection string)
- [ ] 3.2 Create `.env.example` with placeholder environment variables (verify file contains required variables)
- [ ] 3.3 Add Zod validation schema for environment variables (verify validation code runs at startup without crashing)

## 4. Database Setup

- [ ] 4.1 Create `docker-compose.yml` for PostgreSQL (verify file exists)
- [ ] 4.2 Run `docker compose up -d` and verify PostgreSQL container is running (check container status)
- [ ] 4.3 Create initial migration files for Drizzle (verify migration files exist in `migrations/` directory)

## 5. Authentication

- [ ] 5.1 Configure Better Auth with session table and Admin role (verify session table exists in database)
- [ ] 5.2 Implement `/login` page with email and password fields (verify page renders correctly)
- [ ] 5.3 Add Zod validation for login form (verify invalid inputs show error messages)
- [ ] 5.4 Protect `/admin` route with auth middleware (verify unauthenticated access redirects to `/login`)

## 6. Dashboard

- [ ] 5.5 Implement `/admin` dashboard page with placeholder content (verify page loads for authenticated admin)
- [ ] 5.6 Add navigation link to `/login` when not logged in (verify redirect works)

## 7. Seed Script

- [ ] 6.1 Create `seed-admin` CLI script (verify script can be executed and prompts for password)
- [ ] 6.2 Verify seed script creates admin user without hardcoded credentials
- [ ] 6.3 Verify duplicate admin creation is rejected (verify error message)

## 8. Testing

- [ ] 8.1 Configure Vitest to use test database (verify test setup file exists)
- [ ] 8.2 Write test for authentication success flow (verify test passes with valid credentials)
- [ ] 8.3 Write test for authentication failure (verify test fails with invalid credentials)
- [ ] 8.4 Write test for route protection (verify unauthenticated access is blocked)
- [ ] 8.5 Verify test database is cleaned after each test run (verify no leftover data)