import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fxlinavxjdnuzdysiuhg.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bGluYXZ4amRudXpkeXNpdWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTE4MzEsImV4cCI6MjA5NTcyNzgzMX0.sUwrMdV-WGc3G4CSu-C8kuxfI9LCFc9eyJzSAMrGqpA'
  );
}
