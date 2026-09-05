const { Client } = require('pg');

async function migrate() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const connectionString = process.env.DATABASE_URL || `postgresql://postgres.zgtcgpfbhfuwwuiqdlcc:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    console.log('Creating branch_schedules table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS branch_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
          is_open BOOLEAN NOT NULL DEFAULT true,
          open_time TIME NOT NULL DEFAULT '09:00',
          close_time TIME NOT NULL DEFAULT '18:00',
          has_break BOOLEAN NOT NULL DEFAULT true,
          break_start TIME DEFAULT '12:00',
          break_end TIME DEFAULT '13:00',
          slot_duration_minutes INT NOT NULL DEFAULT 60 CHECK (slot_duration_minutes IN (15, 30, 45, 60, 90, 120)),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(branch_id, day_of_week)
      );

      CREATE INDEX IF NOT EXISTS idx_branch_schedules_lookup ON branch_schedules(branch_id, day_of_week);

      ALTER TABLE branch_schedules ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        DROP POLICY IF EXISTS "Anyone can view branch schedules" ON branch_schedules;
        CREATE POLICY "Anyone can view branch schedules" ON branch_schedules FOR SELECT USING (true);
      EXCEPTION WHEN OTHERS THEN NULL; END $$;

      DO $$ BEGIN
        DROP POLICY IF EXISTS "Admins can manage branch schedules" ON branch_schedules;
        CREATE POLICY "Admins can manage branch schedules" ON branch_schedules FOR ALL TO authenticated USING (get_my_role() = 'admin');
      EXCEPTION WHEN OTHERS THEN NULL; END $$;
    `);
    console.log('branch_schedules table and policies ready.');

    // Populate default schedules for any branches that don't have schedules yet
    const { rows: branches } = await client.query(`SELECT id, name FROM branches;`);
    console.log(`Found ${branches.length} branches to check schedules for.`);

    for (const b of branches) {
      for (let day = 0; day <= 6; day++) {
        // 0 = Sunday (Closed by default), 1-6 = Monday to Saturday (Open 09:00 - 18:00)
        const isOpen = day !== 0;
        await client.query(`
          INSERT INTO branch_schedules (
            branch_id, day_of_week, is_open, open_time, close_time,
            has_break, break_start, break_end, slot_duration_minutes
          )
          VALUES ($1, $2, $3, '09:00', '18:00', true, '12:00', '13:00', 60)
          ON CONFLICT (branch_id, day_of_week) DO NOTHING;
        `, [b.id, day, isOpen]);
      }
      console.log(`Initialized schedule for branch: ${b.name}`);
    }

    const { rows: countRes } = await client.query(`SELECT COUNT(*) FROM branch_schedules;`);
    console.log(`Total branch_schedules records in database: ${countRes[0].count}`);

    await client.end();
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

migrate();
