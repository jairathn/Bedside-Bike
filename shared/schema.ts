// Schema re-export
// For local development with SQLite, export from schema.sqlite
// For Azure production with MS SQL, change this to export from schema.mssql
// The database connection in server/db.ts will automatically use the correct driver

export * from './schema.sqlite';
