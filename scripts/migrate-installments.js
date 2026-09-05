const { Client } = require('pg');

async function migrateInstallments() {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: Number(process.env.SUPABASE_DB_PORT) || 6543,
    user: process.env.SUPABASE_DB_USER || 'postgres.zgtcgpfbhfuwwuiqdlcc',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for installment migration...');

    // 1. Add installment columns to treatment_bills table
    await client.query(`
      ALTER TABLE treatment_bills
      ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS plan_type TEXT,
      ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS installment_amount NUMERIC(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'per_visit',
      ADD COLUMN IF NOT EXISTS preferred_schedule JSONB DEFAULT NULL;
    `);
    console.log('Added installment columns to treatment_bills table.');

    // 2. Refresh or update outstanding_balances view to include installment metadata
    await client.query(`DROP VIEW IF EXISTS outstanding_balances CASCADE;`);
    await client.query(`
      CREATE OR REPLACE VIEW outstanding_balances AS
      SELECT 
          b.id AS bill_id,
          b.invoice_number,
          b.patient_id,
          p.first_name,
          p.last_name,
          p.phone,
          b.net_amount,
          COALESCE(SUM(l.amount_logged), 0.00) AS total_paid,
          (b.net_amount - COALESCE(SUM(l.amount_logged), 0.00)) AS balance_due,
          b.status,
          b.is_installment,
          b.plan_type,
          b.downpayment_amount,
          b.installment_amount,
          b.total_installments,
          b.frequency,
          b.preferred_schedule,
          b.created_at
      FROM treatment_bills b
      JOIN patients p ON b.patient_id = p.id
      LEFT JOIN payment_logs l ON b.id = l.bill_id
      GROUP BY 
          b.id, b.invoice_number, b.patient_id, p.first_name, p.last_name, p.phone,
          b.net_amount, b.status, b.is_installment, b.plan_type, b.downpayment_amount,
          b.installment_amount, b.total_installments, b.frequency, b.preferred_schedule, b.created_at
      HAVING (b.net_amount - COALESCE(SUM(l.amount_logged), 0.00)) > 0;
    `);
    console.log('Updated outstanding_balances view with installment metadata.');

    console.log('✅ Installment migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateInstallments();
