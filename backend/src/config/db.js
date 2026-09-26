const { Pool } = require('pg');
const env = require('./env');

// Neon requires SSL. rejectUnauthorized:false is the standard setting for
// Neon's pooled connection string (it presents a cert from a public CA chain
// but the pg driver's default trust store handling is fussy in some
// environments, so this avoids false-negative SSL errors).
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // Errors on idle clients in the pool (e.g. Neon closing an idle connection)
  // should not crash the whole process.
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
