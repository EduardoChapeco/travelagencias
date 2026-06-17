const url = "https://esmppoxxnyiscidzsjvy.supabase.co/rest/v1/";
const apiKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbXBwb3h4bnlpc2NpZHpzanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI1Mzg0OCwiZXhwIjoyMDk2ODI5ODQ4fQ.4fKEXQ_ahfmAPep8sXyyYa5gp9uit39bfOJiwPJ1IkQ";

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data = await res.json();
    const paths = Object.keys(data.paths || {});
    const rpcs = paths.filter((p) => p.startsWith("/rpc/"));
    console.log("Exposed RPC functions:", rpcs);
  } catch (err) {
    console.error("Error fetching OpenAPI:", err);
  }
}

run();
