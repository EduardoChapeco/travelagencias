import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:EEaR6399!%40%232026@db.esmppoxxnyiscidzsjvy.supabase.co:6543/postgres';

async function run() {
  const query = process.argv[2];
  if (!query) {
    console.error('Por favor, forneça uma query SQL como argumento.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(query);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Erro na query:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
