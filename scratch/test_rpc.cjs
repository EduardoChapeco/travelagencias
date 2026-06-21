const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:EEaR6399!%40%232026@db.esmppoxxnyiscidzsjvy.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected!");

    const rpcRes = await client.query(
      "SELECT * FROM pick_active_api_key($1, $2)",
      ["gemini", "bd67d72f-c72b-4571-9a60-75801598ddbb"]
    );
    console.log("RPC pick_active_api_key result:");
    console.log(rpcRes.rows);

    const directRes = await client.query(
      "SELECT provider, key_value, is_active FROM api_keys WHERE agency_id = $1",
      ["bd67d72f-c72b-4571-9a60-75801598ddbb"]
    );
    console.log("Direct query result:");
    console.log(directRes.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
