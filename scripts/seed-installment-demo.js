const { Client } = require('pg');

async function seedInstallmentDemo() {
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
    console.log('Connected to PostgreSQL database...');

    // Patient 2: Maria Clara Ramos (Orthodontic Braces)
    const mariaId = '00000000-0000-0000-0000-000000000102';
    // Check if Maria already has an installment bill
    const existingMaria = await client.query(
      `SELECT id FROM treatment_bills WHERE patient_id = $1 AND is_installment = true`,
      [mariaId]
    );

    if (existingMaria.rows.length === 0) {
      const billRes = await client.query(`
        INSERT INTO treatment_bills (
          invoice_number,
          patient_id,
          total_amount,
          discount_amount,
          status,
          is_installment,
          plan_type,
          downpayment_amount,
          installment_amount,
          total_installments,
          frequency,
          preferred_schedule,
          notes,
          created_at
        ) VALUES (
          'INV-ORTHO-001',
          '${mariaId}',
          45000.00,
          0.00,
          'partially_paid',
          true,
          'orthodontics',
          5000.00,
          1500.00,
          24,
          'per_visit',
          '{"standing_day": "Saturday", "timing": "1st_week", "preferred_time": "10:00", "notes": "Every 1st Saturday @ 10:00 AM"}',
          'Orthodontic Braces Comprehensive Package with 24 monthly adjustments',
          NOW() - INTERVAL '35 days'
        ) RETURNING id;
      `);

      const billId = billRes.rows[0].id;

      // Staff for logging
      const staffRes = await client.query(`SELECT id FROM profiles LIMIT 1`);
      const staffId = staffRes.rows[0].id;

      // Log downpayment of 5,000 paid 35 days ago
      await client.query(`
        INSERT INTO payment_logs (
          bill_id,
          amount_logged,
          payment_method,
          reference_number,
          notes,
          logged_by,
          logged_at
        ) VALUES (
          '${billId}',
          5000.00,
          'gcash',
          'GC-DOWN-9821',
          '[Downpayment] Orthodontic Package Initial Bond Up',
          '${staffId}',
          NOW() - INTERVAL '35 days'
        );
      `);

      // Log 1st adjustment payment of 1,500
      await client.query(`
        INSERT INTO payment_logs (
          bill_id,
          amount_logged,
          payment_method,
          reference_number,
          notes,
          logged_by,
          logged_at
        ) VALUES (
          '${billId}',
          1500.00,
          'cash',
          'CASH-ADJ-001',
          '[Installment #1 of 24] Monthly archwire change',
          '${staffId}',
          NOW() - INTERVAL '30 days'
        );
      `);

      console.log('✅ Created demo orthodontic contract for Maria Clara Ramos (INV-ORTHO-001)!');
    } else {
      console.log('Maria Clara Ramos already has an installment plan.');
    }

    // Patient 3: Roberto Tan (Dental Implant Package)
    const robertoId = '00000000-0000-0000-0000-000000000103';
    const existingRoberto = await client.query(
      `SELECT id FROM treatment_bills WHERE patient_id = $1 AND is_installment = true`,
      [robertoId]
    );

    if (existingRoberto.rows.length === 0) {
      const staffRes = await client.query(`SELECT id FROM profiles LIMIT 1`);
      const staffId = staffRes.rows[0].id;

      const robertoBill = await client.query(`
        INSERT INTO treatment_bills (
          invoice_number,
          patient_id,
          total_amount,
          discount_amount,
          status,
          is_installment,
          plan_type,
          downpayment_amount,
          installment_amount,
          total_installments,
          frequency,
          preferred_schedule,
          notes,
          created_at
        ) VALUES (
          'INV-IMPLANT-001',
          '${robertoId}',
          60000.00,
          0.00,
          'partially_paid',
          true,
          'implants',
          20000.00,
          10000.00,
          4,
          'milestone',
          '{"standing_day": "Friday", "timing": "2nd_week", "preferred_time": "14:00", "notes": "Every 2nd Friday @ 02:00 PM"}',
          'Straumann Titanium Implant Stage I & II + Zirconia Crown',
          NOW() - INTERVAL '45 days'
        ) RETURNING id;
      `);

      const rBillId = robertoBill.rows[0].id;

      // Downpayment paid 45 days ago
      await client.query(`
        INSERT INTO payment_logs (
          bill_id,
          amount_logged,
          payment_method,
          reference_number,
          notes,
          logged_by,
          logged_at
        ) VALUES (
          '${rBillId}',
          20000.00,
          'card',
          'CARD-AUTH-7731',
          '[Downpayment] Fixture placement stage',
          '${staffId}',
          NOW() - INTERVAL '45 days'
        );
      `);

      console.log('✅ Created demo implant contract for Roberto Tan (INV-IMPLANT-001)!');
    } else {
      console.log('Roberto Tan already has an installment plan.');
    }

    await client.end();
  } catch (err) {
    console.error('Error seeding demo installment:', err);
  }
}

seedInstallmentDemo();
