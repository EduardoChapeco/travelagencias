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
    
    // Get column info for brand_kit
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'brand_kit' AND table_schema = 'public';
    `);
    
    console.log('--- brand_kit Columns ---');
    res.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(25)} | Type: ${row.data_type.padEnd(15)} | Nullable: ${row.is_nullable}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
