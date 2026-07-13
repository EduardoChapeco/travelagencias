import pg from 'pg';
import fs from 'fs';

async function run() {
  const client = new pg.Client({
    user: 'postgres',
    host: 'db.esmppoxxnyiscidzsjvy.supabase.co',
    database: 'postgres',
    password: 'EEaR6399!@#2026',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  let logOutput = "";
  function log(msg) {
    console.log(msg);
    logOutput += msg + "\n";
  }

  try {
    await client.connect();
    
    // Check all tables in public schema
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    log(`Total public tables: ${tablesRes.rows.length}`);
    
    // Query all policies
    const policiesRes = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      ORDER BY tablename, cmd;
    `);
    
    // Check for tables without policies
    const tablesWithPolicies = new Set(policiesRes.rows.map(r => r.tablename));
    const tablesWithoutPolicies = tablesRes.rows
      .map(r => r.tablename)
      .filter(t => !tablesWithPolicies.has(t));
      
    log('--- TABLES WITHOUT ANY POLICIES ---');
    if (tablesWithoutPolicies.length === 0) {
      log('None! All tables have at least one policy.');
    } else {
      tablesWithoutPolicies.forEach(t => log(`[WARNING] Table '${t}' has RLS enabled but NO policies defined.`));
    }
    
    log('\n--- POLICIES WITH USING (true) OR NO FILTERS ---');
    let permissiveCount = 0;
    policiesRes.rows.forEach(p => {
      const isPermissive = p.qual === 'true' || p.qual === 'true::boolean' || !p.qual;
      const rolesStr = JSON.stringify(p.roles);
      if (isPermissive && rolesStr.includes('anon')) {
        log(`[CRITICAL] Table: '${p.tablename}' has permissive policy '${p.policyname}' for command '${p.cmd}' and roles ${rolesStr}`);
        permissiveCount++;
      } else if (isPermissive) {
        log(`[INFO] Table: '${p.tablename}' has permissive policy '${p.policyname}' for command '${p.cmd}' and roles ${rolesStr}`);
      }
    });
    if (permissiveCount === 0) {
      log('No permissive policies (USING true) found for anon role.');
    }
    
    // Print all policies for manual review
    log('\n--- ALL POLICIES SUMMARY ---');
    policiesRes.rows.forEach(p => {
      log(`Table: ${p.tablename.padEnd(30)} | Cmd: ${p.cmd.padEnd(6)} | Policy: ${p.policyname.padEnd(40)} | Roles: ${p.roles ? JSON.stringify(p.roles) : '[]'}`);
    });

    fs.writeFileSync('scratch/policies_audit.log', logOutput, 'utf8');
    log('\nLog written to scratch/policies_audit.log');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
