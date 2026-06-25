const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const connectionString =
    "postgresql://postgres:EEaR6399!%40%232026@db.esmppoxxnyiscidzsjvy.supabase.co:5432/postgres";
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to Supabase DB!");

    const migrationPath = path.join(
      __dirname,
      "../supabase/migrations/20260722000000_flight_reaccommodation_workflow.sql",
    );
    console.log("Reading migration from:", migrationPath);
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Applying flight reaccommodation workflow migration...");
    await client.query(sql);
    console.log("Migration applied successfully!");

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('flight_change_cases', 'flight_alternatives', 'flight_difference_analysis', 'customer_travel_decisions', 'operator_reaccommodation_requests')
      ORDER BY table_name;
    `);
    console.log("\nCreated Tables Verification:");
    console.table(res.rows);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

main();
