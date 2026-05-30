import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fxlinavxjdnuzdysiuhg.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bGluYXZ4amRudXpkeXNpdWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTE4MzEsImV4cCI6MjA5NTcyNzgzMX0.sUwrMdV-WGc3G4CSu-C8kuxfI9LCFc9eyJzSAMrGqpA';

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
