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
    SELECT version, name
    FROM supabase_migrations.schema_migrations 
    ORDER BY version;
  `);

  console.log('All migration records in DB (Full):');
  console.dir(res.rows, { maxArrayLength: null });

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
