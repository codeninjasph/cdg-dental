const { Client } = require('pg');

async function seed() {
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
    console.log('Connected to DB for seeding...');

    // 1. Branches
    const branch1Id = '00000000-0000-0000-0000-000000000001';
    const branch2Id = '00000000-0000-0000-0000-000000000002';

    await client.query(`
      INSERT INTO branches (id, name, address, phone, email, is_active)
      VALUES 
        ('${branch1Id}', 'CDG Dental Clinic — Main (Ortigas Center)', 'Suite 402 Medical Arts Tower, Ortigas Center, Pasig City', '+63 917 123 4567', 'ortigas@cdgdental.com', true),
        ('${branch2Id}', 'CDG Dental Clinic — BGC Premier', 'Level 3 Bonifacio High Street Central, Taguig City', '+63 918 987 6543', 'bgc@cdgdental.com', true)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;
    `);

    // 2. Auth Users & Profiles
    const dentistId = '00000000-0000-0000-0000-000000000010';
    const secretaryId = '00000000-0000-0000-0000-000000000020';
    const adminId = '00000000-0000-0000-0000-000000000030';

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Clean old demo auth users if needed
    await client.query(`DELETE FROM auth.users WHERE email IN ('dentist@cdgdental.com', 'secretary@cdgdental.com', 'admin@cdgdental.com');`);

    const users = [
      { id: dentistId, email: 'dentist@cdgdental.com', password: 'dentist123', role: 'dentist', name: 'Dr. Kenneth Galve, DDM' },
      { id: secretaryId, email: 'secretary@cdgdental.com', password: 'secretary123', role: 'secretary', name: 'Maria Santos' },
      { id: adminId, email: 'admin@cdgdental.com', password: 'admin123', role: 'admin', name: 'CDG Clinic Administrator' },
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
          '${u.id}',
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          '${u.email}',
          crypt('${u.password}', gen_salt('bf', 10)),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          '{"full_name":"${u.name}","role":"${u.role}"}',
          NOW(),
          NOW()
        );
      `);

      await client.query(`
        DELETE FROM auth.identities WHERE user_id = '${u.id}' OR provider_id = '${u.id}';
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          '${u.id}',
          jsonb_build_object('sub', '${u.id}', 'role', '${u.role}', 'email', '${u.email}', 'full_name', '${u.name}'),
          'email',
          '${u.id}',
          NOW(),
          NOW(),
          NOW()
        );
      `);

      await client.query(`
        INSERT INTO profiles (id, role, branch_id, full_name, phone)
        VALUES ('${u.id}', '${u.role}', '${branch1Id}', '${u.name}', '+63 917 555 0100')
        ON CONFLICT (id) DO UPDATE SET
          role = EXCLUDED.role,
          full_name = EXCLUDED.full_name;
      `);
    }

    // 3. Patients
    const pat1Id = '00000000-0000-0000-0000-000000000101';
    const pat2Id = '00000000-0000-0000-0000-000000000102';
    const pat3Id = '00000000-0000-0000-0000-000000000103';
    const pat4Id = '00000000-0000-0000-0000-000000000104';

    await client.query(`
      INSERT INTO patients (id, first_name, last_name, phone, email, dob, gender, address, emergency_contact_name, emergency_contact_phone, medical_alerts, primary_branch_id)
      VALUES 
        ('${pat1Id}', 'Juan', 'Dela Cruz', '+63 915 111 2233', 'juan.delacruz@example.com', '1988-05-14', 'Male', 'Quezon City, Metro Manila', 'Juana Dela Cruz', '+63 915 999 8877', 'Penicillin Allergy, Mild Hypertension', '${branch1Id}'),
        ('${pat2Id}', 'Maria Clara', 'Ramos', '+63 920 333 4455', 'maria.ramos@example.com', '1995-11-28', 'Female', 'Makati City, Metro Manila', 'Carlos Ramos', '+63 920 888 7766', NULL, '${branch1Id}'),
        ('${pat3Id}', 'Roberto', 'Tan', '+63 917 777 8899', 'roberto.tan@example.com', '1974-03-09', 'Male', 'Pasig City, Metro Manila', 'Elena Tan', '+63 917 222 3344', 'Diabetic Type 2 (Morning appointments preferred)', '${branch1Id}'),
        ('${pat4Id}', 'Sofia', 'Chen', '+63 908 555 6677', 'sofia.chen@example.com', '2001-08-22', 'Female', 'Taguig City, Metro Manila', 'Grace Chen', '+63 908 111 2233', 'Latex Allergy', '${branch2Id}')
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        medical_alerts = EXCLUDED.medical_alerts;
    `);

    // 4. Tooth Charts for Patients
    console.log('Seeding tooth charts for adult 1-32 Universal numbering...');
    const patientToothData = [
      {
        patientId: pat1Id,
        custom: {
          3: { status: 'crowned', surface: 'Full Porcelain', notes: 'Zirconia Crown placed 2024' },
          14: { status: 'decayed', surface: 'MOD', notes: 'Deep cavity on occlusal surface, sensitive to cold' },
          19: { status: 'filled', surface: 'DO', notes: 'Composite restoration' },
          30: { status: 'extracted', surface: null, notes: 'Extracted due to severe impaction' },
          31: { status: 'bridge', surface: 'Mesial Abutment', notes: 'Bridge pontic' }
        }
      },
      {
        patientId: pat2Id,
        custom: {
          8: { status: 'filled', surface: 'M', notes: 'Class IV cosmetic composite' },
          9: { status: 'filled', surface: 'D', notes: 'Class IV cosmetic composite' },
          18: { status: 'implant', surface: 'Titanium', notes: 'Implant integrated with crown' },
          32: { status: 'missing', surface: null, notes: 'Congenitally absent third molar' }
        }
      },
      {
        patientId: pat3Id,
        custom: {
          4: { status: 'root_canal', surface: 'Obturated', notes: 'Endodontic therapy completed' },
          12: { status: 'decayed', surface: 'O', notes: 'Incipient pit caries' },
          20: { status: 'filled', surface: 'MOD', notes: 'Amalgam replacement' }
        }
      }
    ];

    for (const p of patientToothData) {
      for (let t = 1; t <= 32; t++) {
        const item = p.custom[t] || { status: 'healthy', surface: null, notes: null };
        await client.query(`
          INSERT INTO patient_tooth_chart (patient_id, tooth_number, status, surface, notes, last_updated)
          VALUES ('${p.patientId}', ${t}, '${item.status}', ${item.surface ? `'${item.surface}'` : 'NULL'}, ${item.notes ? `'${item.notes}'` : 'NULL'}, NOW())
          ON CONFLICT (patient_id, tooth_number) DO UPDATE SET
            status = EXCLUDED.status,
            surface = EXCLUDED.surface,
            notes = EXCLUDED.notes;
        `);
      }
    }

    // 5. Appointments
    const now = new Date();
    const apptToday1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const apptToday1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    const apptToday2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0);
    const apptToday2End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
    const apptToday3Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const apptToday3End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);

    const appt1Id = '00000000-0000-0000-0000-000000000201';
    const appt2Id = '00000000-0000-0000-0000-000000000202';
    const appt3Id = '00000000-0000-0000-0000-000000000203';

    await client.query(`
      INSERT INTO appointments (id, patient_id, dentist_id, branch_id, start_time, end_time, status, notes)
      VALUES 
        ('${appt1Id}', '${pat1Id}', '${dentistId}', '${branch1Id}', '${apptToday1Start.toISOString()}', '${apptToday1End.toISOString()}', 'completed', 'Routine prophylaxis and cavity evaluation on tooth #14'),
        ('${appt2Id}', '${pat2Id}', '${dentistId}', '${branch1Id}', '${apptToday2Start.toISOString()}', '${apptToday2End.toISOString()}', 'in_treatment', 'Anterior composite polishing and gingival check'),
        ('${appt3Id}', '${pat3Id}', '${dentistId}', '${branch1Id}', '${apptToday3Start.toISOString()}', '${apptToday3End.toISOString()}', 'confirmed', 'Follow-up on Tooth #4 root canal therapy')
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    `);

    // 6. Treatments
    const t1Id = '00000000-0000-0000-0000-000000000301';
    const t2Id = '00000000-0000-0000-0000-000000000302';
    const t3Id = '00000000-0000-0000-0000-000000000303';

    await client.query(`
      INSERT INTO treatments (id, patient_id, appointment_id, dentist_id, tooth_number, procedure_name, clinical_notes, cost)
      VALUES 
        ('${t1Id}', '${pat1Id}', '${appt1Id}', '${dentistId}', NULL, 'Ultrasonic Scaling & Polishing', 'Full mouth supragingival and subgingival scaling. Mild gingival bleeding on lower anteriors.', 2500.00),
        ('${t2Id}', '${pat1Id}', '${appt1Id}', '${dentistId}', 14, 'Light-Cure Composite Restoration (MOD)', 'Decay excavated completely. Applied bonding agent and layer of Nanohybrid composite shade A2.', 3200.00),
        ('${t3Id}', '${pat2Id}', '${appt2Id}', '${dentistId}', 8, 'Cosmetic Composite Bonding Veneer', 'Re-polished anterior composite edge for improved symmetry.', 2800.00)
      ON CONFLICT (id) DO UPDATE SET
        procedure_name = EXCLUDED.procedure_name,
        clinical_notes = EXCLUDED.clinical_notes,
        cost = EXCLUDED.cost;
    `);

    // 7. Bills & Payments
    const bill1Id = '00000000-0000-0000-0000-000000000401';
    const bill2Id = '00000000-0000-0000-0000-000000000402';

    await client.query(`
      INSERT INTO treatment_bills (id, invoice_number, patient_id, appointment_id, total_amount, discount_amount, due_date, notes)
      VALUES 
        ('${bill1Id}', 'INV-202609-0001', '${pat1Id}', '${appt1Id}', 5700.00, 500.00, CURRENT_DATE, 'Discount voucher applied for package scaling + restoration'),
        ('${bill2Id}', 'INV-202609-0002', '${pat2Id}', '${appt2Id}', 2800.00, 0.00, CURRENT_DATE, 'Awaiting final payment after treatment')
      ON CONFLICT (id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        discount_amount = EXCLUDED.discount_amount;
    `);

    const pay1Id = '00000000-0000-0000-0000-000000000501';
    await client.query(`
      INSERT INTO payment_logs (id, bill_id, amount_logged, payment_method, reference_number, notes, logged_by)
      VALUES 
        ('${pay1Id}', '${bill1Id}', 3000.00, 'gcash', 'GC-890214890', 'Partial downpayment via GCash QR', '${secretaryId}')
      ON CONFLICT (id) DO UPDATE SET
        amount_logged = EXCLUDED.amount_logged;
    `);

    console.log('Database seeded successfully!');

    const balances = await client.query('SELECT invoice_number, first_name, last_name, net_amount, total_paid, balance_due FROM outstanding_balances;');
    console.log('\nOutstanding Balances View:');
    console.table(balances.rows);

    const bills = await client.query('SELECT invoice_number, total_amount, discount_amount, net_amount, status FROM treatment_bills;');
    console.log('\nTreatment Bills with Trigger Status:');
    console.table(bills.rows);

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await client.end();
  }
}

seed();
