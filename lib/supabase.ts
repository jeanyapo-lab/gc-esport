import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client Supabase utilisable côté navigateur (lecture des données publiques :
// compétitions, joueurs publics, classements...)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
