// ============================================
// GIRL, the Butler - Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://imvpwcuzzjgcpikwgwqd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdnB3Y3V6empnY3Bpa3dnd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NTAzNjIsImV4cCI6MjEwMDUyNjM2Mn0.VFLm4Ukgw2VqJiS8C6Q9mZGATgph-SIVxqMRyGHOz00';

// Initialize Supabase client (available globally)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
