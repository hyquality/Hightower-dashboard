import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || 'https://gxwurcysysqbulbbazph.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3VyY3lzeXNxYnVsYmJhenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjczMDYsImV4cCI6MjA4OTYwMzMwNn0.RlB52DP8mf5H0WjHkd0K_fJ1dLVQ0Z2Rr7ZVJ1qO1Z0';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
