import { createClient } from "@supabase/supabase-js";

const url = "https://esmppoxxnyiscidzsjvy.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTM4NDgsImV4cCI6MjA5NjgyOTg0OH0.qe1dTo-tz-iO-J9tMBXgUKS8-R2rfZipjcAiGf0kZbY";

const supabase = createClient(url, key);

async function runTest() {
  console.log("Starting RLS Test...");
  const emailA = "test_agency_a_" + Date.now() + "@example.com";
  const password = "TestPassword123!";

  console.log(`Signing up ${emailA}...`);
  const resA = await supabase.auth.signUp({ email: emailA, password });
  console.log("Signup error:", resA.error ? resA.error.message : "None");
  console.log("Has session:", !!resA.data?.session);

  // If no session, it means email confirmation is required.
  // Testing RLS against a production cloud instance where email confirmation is required might be blocked.
  if (resA.data?.session) {
    const { data: agencies, error: agErr } = await supabase.from("agencies").select("*");
    console.log("Agencies A sees:", agencies?.length, agErr?.message || "No error");
  }
}

runTest().catch(console.error);
