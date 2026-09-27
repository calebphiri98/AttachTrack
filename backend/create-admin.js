const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

async function createAdmin() {
  const name = 'Yahyeh';
  const email = 'yahyeh1414@gmail.com';
  const password = 'Macagreje#123';

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE users
         SET name = $1,
             password_hash = $2,
             role = 'admin',
             email_verified = TRUE,
             updated_at = NOW()
         WHERE email = $3`,
        [name, passwordHash, email]
      );

      console.log('Admin account updated successfully.');
    } else {
      await db.query(
        `INSERT INTO users
         (name, email, password_hash, role, email_verified)
         VALUES ($1, $2, $3, 'admin', TRUE)`,
        [name, email, passwordHash]
      );

      console.log('Admin account created successfully.');
    }

    const result = await db.query(
      `SELECT id, name, email, role, email_verified
       FROM users
       WHERE email = $1`,
      [email]
    );

    console.log(result.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.pool.end();
  }
}

createAdmin();