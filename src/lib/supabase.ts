import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safe to expose in the frontend: the anon key only grants what the RLS
// policies in supabase/schema.sql allow. Never use the service_role key here.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
