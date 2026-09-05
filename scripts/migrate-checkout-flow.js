const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: Number(process.env.SUPABASE_DB_PORT) || 6543,
    user: process.env.SUPABASE_DB_USER || 'postgres.zgtcgpfbhfuwwuiqdlcc',
    password: process.env.SUPABASE_DB_PASSWORD || 'Hv2KRnXT1xS2IdEQ',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for checkout flow migration...');

    // 1. Add dentist_id to treatment_bills table
    await client.query(`
      ALTER TABLE treatment_bills
      ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    `);
    console.log('Added dentist_id to treatment_bills table.');

    // 2. Add bill_id and billing_status to treatments table
    await client.query(`
      ALTER TABLE treatments
      ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES treatment_bills(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending';
    `);
    console.log('Added bill_id and billing_status to treatments table.');

    // 3. Create index for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_treatments_bill ON treatments(bill_id);
      CREATE INDEX IF NOT EXISTS idx_treatments_pending ON treatments(patient_id, billing_status);
      CREATE INDEX IF NOT EXISTS idx_treatment_bills_dentist ON treatment_bills(dentist_id);
    `);
    console.log('Created indexes on treatments and treatment_bills.');

    // 4. Retroactively backfill existing records:
    // Link existing treatments that have corresponding bills
    const backfill = await client.query(`
      UPDATE treatments t
      SET bill_id = b.id, billing_status = 'billed'
      FROM treatment_bills b
      WHERE t.patient_id = b.patient_id 
        AND t.bill_id IS NULL
        AND (
          b.notes ILIKE ('%' || t.procedure_name || '%')
          OR (t.created_at::date = b.created_at::date AND t.cost = b.total_amount)
        );
    `);
    console.log(`Backfilled ${backfill.rowCount} existing treatments with matching bills.`);

    // Also mark any remaining existing treatments as billed if their patient has fully paid bills
    await client.query(`
      UPDATE treatments
      SET billing_status = 'billed'
      WHERE billing_status IS NULL;
    `);

    // Backfill dentist_id on treatment_bills from treatments or appointments
    const backfillDentist = await client.query(`
      UPDATE treatment_bills b
      SET dentist_id = t.dentist_id
      FROM treatments t
      WHERE b.dentist_id IS NULL AND t.bill_id = b.id;
    `);
    console.log(`Backfilled dentist_id on ${backfillDentist.rowCount} treatment_bills from treatments.`);

    const backfillApptDentist = await client.query(`
      UPDATE treatment_bills b
      SET dentist_id = a.dentist_id
      FROM appointments a
      WHERE b.dentist_id IS NULL AND b.appointment_id = a.id;
    `);
    console.log(`Backfilled dentist_id on ${backfillApptDentist.rowCount} treatment_bills from appointments.`);

    console.log('✅ Checkout flow migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
