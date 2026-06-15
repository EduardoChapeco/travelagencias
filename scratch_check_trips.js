import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://esmppoxxnyiscidzsjvy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ"
);

async function check() {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .limit(1);
  if (error) {
    console.log("trips check FAILED:", error.message);
  } else {
    console.log("trips check SUCCESS! Keys:", Object.keys(data[0] || {}));
  }
}

check();
