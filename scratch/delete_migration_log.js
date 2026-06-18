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
    SELECT * 
    FROM supabase_migrations.schema_migrations 
    WHERE version IN ('20260614000003', '20260620000000', '20260621000000')
    ORDER BY version;
  `);

  console.log('Target migration records:');
  console.log(res.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
