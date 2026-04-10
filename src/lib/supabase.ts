import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables are missing. Using project fallbacks from test-supabase.js.");
} else {
  console.log("Supabase client initialized with environment variables.");
}

// Ensure we don't crash if variables are missing
export const supabase = createClient(supabaseUrl, supabaseKey);
