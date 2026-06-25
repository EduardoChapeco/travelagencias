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
      "../supabase/migrations/20260718000000_financial_security_fixes.sql",
    );
    console.log("Reading migration from:", migrationPath);
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Applying security hardening migration...");
    await client.query(sql);
    console.log("Migration applied successfully!");

    // Verify policies
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('financial_ledger_entries', 'seller_adjustments')
      ORDER BY tablename, policyname;
    `);
    console.log("\nApplied Policies Verification:");
    console.table(res.rows);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

main();
