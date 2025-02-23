import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema"; // Ensure this file exists

// Set WebSocket for NeonDB
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing! Make sure it's set in your environment.");
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Initialize the database connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Ensure secure connection
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

console.log("✅ Connected to the database successfully!");
