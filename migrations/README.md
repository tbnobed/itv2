# Database Migration Strategy
## Generated Migration Files
This directory contains Drizzle ORM migration files generated from shared/schema.ts

## Usage
- In Docker: migrations are applied automatically via docker-entrypoint.sh
- Development: use `npm run db:push` for immediate schema changes
- Production: use `npx drizzle-kit migrate` for proper migration application
