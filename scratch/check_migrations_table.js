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
  console.log('Connected!');

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'supabase_migrations' 
    ORDER BY table_name;
  `);

  console.log('Tables in supabase_migrations schema:');
  console.log(res.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
