import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Messaggio chiaro se le chiavi non sono configurate
  console.error(
    "Mancano le variabili VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Controlla il file .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
