import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8").split("\n").reduce((acc, line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) {
    acc[k.trim()] = v.join("=").replace(/"/g, "").trim();
  }
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.from("cash_registers").select("id").limit(1);
  console.log("cash_registers check:", { data, error });

  const { data: data2, error: error2 } = await supabase.from("group_tour_costs").select("id").limit(1);
  console.log("group_tour_costs check:", { data: data2, error: error2 });
}

check();
