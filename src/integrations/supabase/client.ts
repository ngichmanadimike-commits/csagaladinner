import { createClient } from "@supabase/supabase-js";

// Support both key names (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fallback so the app renders even without Supabase credentials
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey &&
  supabaseAnonKey !== "placeholder-key");
