import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zwagpmwhzzwkxkuvntpc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YWdwbXdoenp3a3hrdXZudHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTYxODUsImV4cCI6MjA5MzczMjE4NX0.MMNMs8T_6v-cGoPuso8moyz9zPJa3WCSf9KpYXSbNh8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
