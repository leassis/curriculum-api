# Dedicated Postgres schema `curriculum_api`

All tables, and Drizzle's migrations table, live in the schema `curriculum_api` instead of `public`, so the package can share a database with the consumer's own tables without name clashes. We picked an underscore over `curriculum-api` because a hyphenated identifier must be double-quoted in every raw SQL statement, psql session and documented query. The name is fixed in code (Drizzle's `pgSchema` is static), so consumers cannot rename it.
