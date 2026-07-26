// ============================================
// GIRL, the Butler - Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://imvpwcuzzjgcpikwgwqd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TuvqYJ8gaQndQncUxenfVw_AYOfz8lJ';

// Initialize Supabase client (available globally)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
