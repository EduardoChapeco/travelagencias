/**
 * Compatibility boundary for the historical Supabase integration import path.
 *
 * The generated schema source of truth is `src/types/supabase.ts`, matching the
 * project deploy and type-generation contract. Keep this file as a type-only
 * re-export until all consumers have migrated to the canonical path.
 */
export type { Database, Json } from "@/types/supabase";
