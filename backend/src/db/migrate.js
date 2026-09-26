// Run with: npm run migrate
// Applies schema.sql to whatever DATABASE_URL points at. Safe to run once
// against a fresh Neon database; re-running will error on "already exists"
// since there's no drop/if-not-exists guarding — that's intentional so you
// don't accidentally wipe data. For real migrations later (adding a column
// etc.), drop numbered .sql files into db/migrations/ instead of editing
// schema.sql directly.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');

async function migrate() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying schema.sql to Neon...');
  try {
    await pool.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
