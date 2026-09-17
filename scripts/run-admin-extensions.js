const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read environment variable from .env.local if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  }
}

loadEnv();

async function runMigration() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error("Error: SUPABASE_DB_PASSWORD environment variable is missing.");
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.zgtcgpfbhfuwwuiqdlcc:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database...");

    const sqlPath = path.join(__dirname, '..', 'supabase', 'schema_admin_extensions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing schema_admin_extensions.sql...");
    await client.query(sql);

    console.log("Migration successful!");

    // Verify tables
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('dental_services', 'audit_logs');"
    );
    console.log("Verified created tables:", tableRes.rows.map(r => r.table_name));

    // Verify services count
    const countRes = await client.query("SELECT COUNT(*) FROM public.dental_services;");
    console.log("Total seeded dental services in DB:", countRes.rows[0].count);

    // Verify treatment_bills columns
    const colRes = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'treatment_bills' AND column_name LIKE 'discount_%';"
    );
    console.log("Verified treatment_bills discount columns:", colRes.rows.map(r => r.column_name));

    await client.end();
  } catch (err) {
    console.error("Migration failed:", err);
    await client.end();
    process.exit(1);
  }
}

runMigration();
