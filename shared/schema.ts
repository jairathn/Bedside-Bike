// Schema re-export - conditionally based on database type
// For PostgreSQL (Supabase), use schema.postgres
// For SQLite (local dev), use schema.sqlite

const USE_POSTGRES = typeof process !== 'undefined' && process.env?.USE_POSTGRES === 'true';

// Export from the correct schema based on environment
// Note: This is a static export, so for production builds targeting PostgreSQL,
// ensure USE_POSTGRES is set at build time, or import directly from schema.postgres

export * from './schema.postgres';
