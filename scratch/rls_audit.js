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
    console.log('Connecting to Supabase Postgres (direct host, postgres user)...');
    await client.connect();
    console.log('Connected! Auditing RLS...');
    
    const query = `
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = false;
    `;
    
    const res = await client.query(query);
    console.log('--- TABLES WITH DISABLED RLS (VULNERABILITY CVE-2025-48757) ---');
    if (res.rows.length === 0) {
      console.log('Zero tables found with disabled RLS. Perfect!');
    } else {
      res.rows.forEach(row => {
        console.log(`[ALERT] Table: ${row.tablename} has rowsecurity = ${row.rowsecurity}`);
      });
    }
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
