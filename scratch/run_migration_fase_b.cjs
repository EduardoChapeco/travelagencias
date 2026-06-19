// Phase B migration runner — uses Supabase service role key via REST
// Run with: node scratch/run_migration_fase_b.cjs

const https = require("https");
const fs = require("fs");
const path = require("path");

// Read .env
const envRaw = fs.readFileSync(path.join(__dirname, "../.env"), "utf-8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const projectId = env.SUPABASE_PROJECT_ID || "esmppoxxnyiscidzsjvy";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env");
  process.exit(1);
}

// Execute SQL statements one by one to get granular error reporting
const statements = [
  {
    name: "1a. ADD COLUMN group_tour_id",
    sql: `ALTER TABLE public.boarding_rooming_list ADD COLUMN IF NOT EXISTS group_tour_id uuid REFERENCES public.group_tours(id) ON DELETE CASCADE;`,
  },
  {
    name: "1b. DROP NOT NULL card_id",
    sql: `ALTER TABLE public.boarding_rooming_list ALTER COLUMN card_id DROP NOT NULL;`,
  },
  {
    name: "1c. CREATE INDEX group_tour_id",
    sql: `CREATE INDEX IF NOT EXISTS rooming_list_group_tour_idx ON public.boarding_rooming_list(group_tour_id);`,
  },
  {
    name: "2. MIGRATE JSONB → rows",
    sql: `
INSERT INTO public.boarding_rooming_list (
  agency_id, group_tour_id, card_id, room_number, room_type,
  hotel_name, checkin_date, checkout_date, notes, is_confirmed, passengers, order_index
)
SELECT
  gt.agency_id,
  gt.id AS group_tour_id,
  NULL AS card_id,
  COALESCE(room->>'room_number', 'Quarto')::text,
  COALESCE(room->>'room_type', 'double'),
  room->>'hotel_name',
  NULLIF(room->>'checkin_date', '')::date,
  NULLIF(room->>'checkout_date', '')::date,
  room->>'notes',
  COALESCE((room->>'is_confirmed')::boolean, false),
  COALESCE(room->'passengers', '[]'::jsonb),
  (row_number() OVER (PARTITION BY gt.id ORDER BY (room->>'room_number')))::int
FROM public.group_tours gt,
     jsonb_array_elements(
       CASE WHEN jsonb_typeof(gt.rooming_list) = 'array' THEN gt.rooming_list ELSE '[]'::jsonb END
     ) AS room
WHERE gt.rooming_list IS NOT NULL
  AND gt.rooming_list != 'null'::jsonb
  AND gt.rooming_list != '[]'::jsonb;`,
  },
  {
    name: "3. DROP COLUMN rooming_list from group_tours",
    sql: `ALTER TABLE public.group_tours DROP COLUMN IF EXISTS rooming_list;`,
  },
  {
    name: "4a. DROP old RLS policies",
    sql: `
DROP POLICY IF EXISTS "rooming read"   ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming insert" ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming update" ON public.boarding_rooming_list;
DROP POLICY IF EXISTS "rooming delete" ON public.boarding_rooming_list;`,
  },
  {
    name: "4b. CREATE new RLS policies",
    sql: `
CREATE POLICY "rooming read" ON public.boarding_rooming_list
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "rooming insert" ON public.boarding_rooming_list
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "rooming update" ON public.boarding_rooming_list
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "rooming delete" ON public.boarding_rooming_list
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.is_agency_member(auth.uid(), agency_id)
  );`,
  },
  {
    name: "VERIFY — check columns",
    sql: `
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='boarding_rooming_list' AND column_name='group_tour_id') AS has_group_tour_id,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='group_tours' AND column_name='rooming_list') AS has_legacy_jsonb,
  (SELECT COUNT(*) FROM public.boarding_rooming_list WHERE group_tour_id IS NOT NULL) AS migrated_rows;`,
  },
];

async function execSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: `${projectId}.supabase.co`,
        path: "/rest/v1/rpc/",
        method: "POST",
      },
      (res) => {
        // Use Management API instead
        resolve({ status: res.statusCode });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// Use the pg REST endpoint
async function execViaApi(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${projectId}/database/query`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log("🚀 Fase B — Rooming List Consolidation\n");
  for (const stmt of statements) {
    process.stdout.write(`  ▶ ${stmt.name} ... `);
    try {
      const result = await execViaApi(stmt.sql.trim());
      if (result.status >= 200 && result.status < 300) {
        const body = result.body;
        if (Array.isArray(body) && body.length > 0) {
          console.log(`✅ OK — ${JSON.stringify(body[0])}`);
        } else {
          console.log(`✅ OK`);
        }
      } else {
        console.log(`❌ HTTP ${result.status}: ${JSON.stringify(result.body)}`);
        process.exit(1);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
      process.exit(1);
    }
  }
  console.log("\n✅ Fase B concluída com sucesso!");
})();
