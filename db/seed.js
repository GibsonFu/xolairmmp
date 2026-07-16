require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./pool');

const seedData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'seed_data.json'), 'utf-8')
);

const ADMIN_USERNAMES = ['Gibson', 'Sandy', 'Tim'];
const DEFAULT_PASSWORD = '0000';

const DEFAULT_OPTIONS = {
  team: ['SCN1', 'SCN2', 'SCC', 'SCS'],
  customer_tier: ['MC', 'RH', 'AH'],
  customer_relationship: ['陌生', '認識', '熟識'],
  adoption_ladder: ['未接觸', '試用', '採用', '倡導'],
  current_status: ['減少使用(處方他廠)', '維持使用', '持續做為首選'],
};

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const psr of seedData.psrs) {
      await client.query(
        `INSERT INTO psrs (code, name) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [psr.code, psr.name]
      );
    }

    for (const c of seedData.customers) {
      await client.query(
        `INSERT INTO customers (psr_code, specialty, tiering, customer_code, customer_name, contact_name, department, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (psr_code, customer_code, contact_name) DO UPDATE
           SET specialty = EXCLUDED.specialty,
               tiering = EXCLUDED.tiering,
               customer_name = EXCLUDED.customer_name,
               department = EXCLUDED.department,
               title = EXCLUDED.title`,
        [c.psr_code, c.specialty, c.tiering, c.customer_code, c.customer_name, c.contact_name, c.department, c.title]
      );
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const psr of seedData.psrs) {
      await client.query(
        `INSERT INTO users (username, password_hash, must_change_password, role, display_name, psr_code)
         VALUES ($1, $2, TRUE, 'psr', $3, $1)
         ON CONFLICT (username) DO NOTHING`,
        [psr.code, passwordHash, psr.name]
      );
    }

    for (const admin of ADMIN_USERNAMES) {
      await client.query(
        `INSERT INTO users (username, password_hash, must_change_password, role, display_name, psr_code)
         VALUES ($1, $2, TRUE, 'admin', $1, NULL)
         ON CONFLICT (username) DO NOTHING`,
        [admin, passwordHash]
      );
    }

    // options 是純設定資料（不是使用者填寫的內容），每次都用 DEFAULT_OPTIONS 覆蓋，
    // 這樣改字典只需要改這份程式碼，不會留下舊選項
    for (const [category, values] of Object.entries(DEFAULT_OPTIONS)) {
      await client.query('DELETE FROM options WHERE category = $1', [category]);
      for (let i = 0; i < values.length; i++) {
        await client.query(
          'INSERT INTO options (category, value, sort_order) VALUES ($1, $2, $3)',
          [category, values[i], i]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Seed complete: ${seedData.psrs.length} PSR accounts, ${ADMIN_USERNAMES.length} admin accounts, ${seedData.customers.length} customers.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
