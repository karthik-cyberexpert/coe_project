
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './migration/backend/.env' });

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'coe_app',
    password: process.env.DB_PASSWORD || 'Test@123',
    database: process.env.DB_NAME || 'coe_db'
  });

  try {
    console.log('Adding is_downloaded column to sheets table...');
    await pool.execute(`
      ALTER TABLE sheets 
      ADD COLUMN is_downloaded BOOLEAN DEFAULT FALSE;
    `);
    console.log('Success!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await pool.end();
  }
}

migrate();
