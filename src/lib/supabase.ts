import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Singleton: reuse the same client instance for connection pooling
const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

export function createClient() {
  return supabase;
}
