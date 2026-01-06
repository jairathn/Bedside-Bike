import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

const USE_POSTGRES = process.env.USE_POSTGRES === 'true' && process.env.DATABASE_URL;

export default USE_POSTGRES
  ? defineConfig({
      out: "./migrations-pg",
      schema: "./shared/schema.postgres.ts",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
    })
  : defineConfig({
      out: "./migrations",
      schema: "./shared/schema.sqlite.ts",
      dialect: "sqlite",
      dbCredentials: {
        url: process.env.DATABASE_URL || "file:local.db",
      },
    });
