const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:EEaR6399!%40%232026@db.esmppoxxnyiscidzsjvy.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to DB!");
    
    const res = await client.query("SELECT id, provider, agency_id, is_active, key_value LIKE '=====%' as is_encrypted FROM api_keys;");
    console.log("API keys:");
    console.log(res.rows);

    const resAgencies = await client.query("SELECT id, name, slug FROM agencies;");
    console.log("Agencies:");
    console.log(resAgencies.rows);

    const resUserRoles = await client.query("SELECT user_id, agency_id, role FROM user_roles;");
    console.log("User Roles:");
    console.log(resUserRoles.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
