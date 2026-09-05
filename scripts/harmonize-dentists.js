const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.zgtcgpfbhfuwwuiqdlcc:Hv2KRnXT1xS2IdEQ@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const SEED_GALVE_ID = '00000000-0000-0000-0000-000000000010';
const AUTH_GALVE_ID = '3cb85fbe-8060-4347-915a-1d400aa160ca';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Step 1: Verify AUTH_GALVE_ID exists in public.profiles ---');
    const authProfile = await client.query('SELECT * FROM public.profiles WHERE id = $1', [AUTH_GALVE_ID]);
    console.log('Auth profile:', authProfile.rows[0]);

    console.log('--- Step 2: Migrate appointments from SEED_GALVE_ID to AUTH_GALVE_ID ---');
    const aptUpdate = await client.query(
      'UPDATE public.appointments SET dentist_id = $1 WHERE dentist_id = $2 RETURNING id;',
      [AUTH_GALVE_ID, SEED_GALVE_ID]
    );
    console.log(`Updated ${aptUpdate.rows.length} appointments to AUTH_GALVE_ID`);

    console.log('--- Step 3: Migrate treatments from SEED_GALVE_ID to AUTH_GALVE_ID ---');
    const treatUpdate = await client.query(
      'UPDATE public.treatments SET dentist_id = $1 WHERE dentist_id = $2 RETURNING id;',
      [AUTH_GALVE_ID, SEED_GALVE_ID]
    );
    console.log(`Updated ${treatUpdate.rows.length} treatments to AUTH_GALVE_ID`);

    console.log('--- Step 3b: Migrate payment_logs from SEED_GALVE_ID to AUTH_GALVE_ID ---');
    const payUpdate = await client.query(
      'UPDATE public.payment_logs SET logged_by = $1 WHERE logged_by = $2 RETURNING id;',
      [AUTH_GALVE_ID, SEED_GALVE_ID]
    );
    console.log(`Updated ${payUpdate.rows.length} payment logs to AUTH_GALVE_ID`);

    console.log('--- Step 3c: Migrate patient_documents from SEED_GALVE_ID to AUTH_GALVE_ID ---');
    const docUpdate = await client.query(
      'UPDATE public.patient_documents SET uploaded_by = $1 WHERE uploaded_by = $2 RETURNING id;',
      [AUTH_GALVE_ID, SEED_GALVE_ID]
    );
    console.log(`Updated ${docUpdate.rows.length} patient documents to AUTH_GALVE_ID`);

    console.log('--- Step 4: Update public.dentists record for Dr. Galve ---');
    const dAuth = await client.query('SELECT id FROM public.dentists WHERE id = $1', [AUTH_GALVE_ID]);
    if (dAuth.rows.length > 0) {
      await client.query('DELETE FROM public.dentists WHERE id = $1', [SEED_GALVE_ID]);
      console.log('Deleted obsolete seed row from public.dentists');
    } else {
      await client.query('UPDATE public.dentists SET id = $1 WHERE id = $2', [AUTH_GALVE_ID, SEED_GALVE_ID]);
      console.log('Updated public.dentists Dr. Galve ID to AUTH_GALVE_ID');
    }

    console.log('--- Step 5: Remove redundant seed profile in public.profiles ---');
    await client.query('DELETE FROM public.profiles WHERE id = $1', [SEED_GALVE_ID]);
    console.log('Deleted redundant seed profile from public.profiles');

    // Also clean up auth.users seed user if still present
    await client.query('DELETE FROM auth.identities WHERE user_id = $1::uuid', [SEED_GALVE_ID]);
    await client.query('DELETE FROM auth.users WHERE id = $1::uuid', [SEED_GALVE_ID]);
    console.log('Cleaned up redundant seed user from auth.users');

    console.log('--- Step 6: Ensure all public.dentists exist in public.profiles ---');
    const allDentists = await client.query('SELECT * FROM public.dentists;');
    for (const d of allDentists.rows) {
      await client.query(`
        INSERT INTO public.profiles (id, full_name, role, is_active, created_at)
        VALUES ($1::uuid, $2, 'dentist', $3, now())
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = 'dentist',
            is_active = EXCLUDED.is_active;
      `, [d.id, d.name, d.is_active]);
    }
    console.log(`Ensured ${allDentists.rows.length} dentists exist in public.profiles`);

    console.log('--- Step 7: Ensure all dentist profiles exist in public.dentists ---');
    const allDentistProfiles = await client.query("SELECT * FROM public.profiles WHERE role = 'dentist';");
    for (const p of allDentistProfiles.rows) {
      const exists = await client.query('SELECT id FROM public.dentists WHERE id = $1', [p.id]);
      if (exists.rows.length === 0) {
        await client.query(`
          INSERT INTO public.dentists (
            id, name, title, prc_license, photo_url, specialty, education, certifications,
            experience_years, bio, clinic_days, display_order, is_active
          ) VALUES (
            $1, $2, 'Attending Dental Specialist', 'PRC Verified', '/images/dentist-dr-kenneth.jpg',
            'General Dental Medicine & Patient Care', 'Doctor of Dental Medicine', '[]'::jsonb,
            5, 'Dedicated dental specialist at CDG Dental Clinic delivering gentle, modern clinical care.',
            '[]'::jsonb, 99, $3
          );
        `, [p.id, p.full_name, p.is_active]);
        console.log(`Synced dentist profile ${p.full_name} (${p.id}) into public.dentists`);
      }
    }

    await client.query('COMMIT');
    console.log('--- Harmonization complete and committed successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Harmonization failed, rolled back:', err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
