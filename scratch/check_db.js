import pg from 'pg';

const client = new pg.Client({
  host: 'db.esmppoxxnyiscidzsjvy.supabase.co',
  port: 6543,
  user: 'postgres',
  password: 'EEaR6399!@#2026',
  database: 'postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase DB!');

  // Query list of tables in public schema
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'trip_passengers' 
      AND table_schema = 'public'
    ORDER BY column_name;
  `);

  console.log('Columns in trip_passengers:');
  console.dir(res.rows, { maxArrayLength: null });

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
