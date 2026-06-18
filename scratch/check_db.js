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
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Tables in public schema:');
  console.log(res.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
