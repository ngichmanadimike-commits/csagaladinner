import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ivdwqewbxgjmclolyjbr.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZHdxZXdieGdqbWNsb2x5amJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODE4MzIsImV4cCI6MjA5MTQ1NzgzMn0.cVEurM60jv_EV-3DO20o4Rd9y40TXB7rLo6fgNxP5HQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
