const { Pool } = require('pg');
const dns = require('dns');
const net = require('net');
const env = require('./env');

dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false); // Neon's dual-stack racing hangs on this network; force single-family connect

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('connect', () => {
  console.log('PostgreSQL connection established');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};