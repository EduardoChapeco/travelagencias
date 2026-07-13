import pg from 'pg';

async function run() {
  const client = new pg.Client({
    user: 'postgres',
    host: 'db.esmppoxxnyiscidzsjvy.supabase.co',
    database: 'postgres',
    password: 'EEaR6399!@#2026',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Get the exact SQL definition of the policies for brand_kit
    const res = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'brand_kit' AND schemaname = 'public';
    `);
    
    console.log('--- brand_kit policies ---');
    res.rows.forEach(row => {
      console.log(`Policy: ${row.policyname}`);
      console.log(`Command: ${row.cmd}`);
      console.log(`Roles: ${JSON.stringify(row.roles)}`);
      console.log(`QUAL: ${row.qual}`);
      console.log(`WITH_CHECK: ${row.with_check}`);
      console.log('-------------------------');
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
