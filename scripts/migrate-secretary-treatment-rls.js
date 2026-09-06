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
    console.log('Connected to PostgreSQL database for Secretary Treatment RLS migration...');

    // 1. Drop existing restricted policy on treatments
    await client.query(`
      DROP POLICY IF EXISTS "Dentists and admins can add/edit treatments" ON treatments;
      DROP POLICY IF EXISTS "Staff can add/edit treatments" ON treatments;
      DROP POLICY IF EXISTS "Staff can update treatment billing status" ON treatments;
    `);
    console.log('Dropped outdated treatment policies.');

    // 2. Create updated policy: Dentists and admins can manage treatments, and secretaries can update treatments for checkout/billing
    await client.query(`
      CREATE POLICY "Staff can manage treatments" ON treatments
        FOR ALL TO authenticated
        USING (get_my_role() IN ('dentist', 'admin', 'secretary'))
        WITH CHECK (get_my_role() IN ('dentist', 'admin', 'secretary'));
    `);
    console.log('Created "Staff can manage treatments" policy covering dentist, admin, and secretary.');

    // 3. Backfill orphaned pending treatments where invoices were already created
    const backfillResult = await client.query(`
      UPDATE treatments t
      SET bill_id = b.id, billing_status = 'billed'
      FROM treatment_bills b
      WHERE t.patient_id = b.patient_id
        AND t.billing_status = 'pending'
        AND (
          b.notes ILIKE ('%' || t.procedure_name || '%')
          OR (t.created_at::date <= b.created_at::date)
        );
    `);
    console.log(`Backfilled ${backfillResult.rowCount} orphaned treatments to 'billed' linked to existing invoices.`);

    // 4. Verify remaining pending treatments
    const remaining = await client.query(`
      SELECT count(*) as pending_count FROM treatments WHERE billing_status = 'pending';
    `);
    console.log(`Remaining genuinely pending treatments in DB: ${remaining.rows[0].pending_count}`);

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
