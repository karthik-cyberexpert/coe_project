const mysql = require('mysql2/promise');
require('dotenv').config({ path: './migration/backend/.env' });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'coe_app',
      password: process.env.DB_PASSWORD || 'CoeApp@2024',
      database: process.env.DB_NAME || 'coe_project',
      port: process.env.DB_PORT || 3306
    });

    console.log('=== AERONAUTICAL ENGINEERING SHEETS ===');
    const [sheets] = await conn.execute(`
      SELECT s.id, s.sheet_name, s.subject_id, s.department_id, 
             sub.subject_code, sub.subject_name, d.department_name
      FROM sheets s 
      JOIN subjects sub ON s.subject_id = sub.id 
      JOIN departments d ON s.department_id = d.id 
      WHERE d.department_name LIKE '%AERO%' 
      LIMIT 20
    `);
    console.log(JSON.stringify(sheets, null, 2));

    console.log('\n=== ALL DEPARTMENTS ===');
    const [depts] = await conn.execute('SELECT id, department_name FROM departments');
    console.log(JSON.stringify(depts, null, 2));

    console.log('\n=== SUBJECTS WITH NULL DEPARTMENT (COMMON) ===');
    const [commonSubjects] = await conn.execute('SELECT id, subject_code, subject_name, department_id FROM subjects WHERE department_id IS NULL LIMIT 10');
    console.log(JSON.stringify(commonSubjects, null, 2));

    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
