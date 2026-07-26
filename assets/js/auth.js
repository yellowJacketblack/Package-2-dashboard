// ============================================
// GIRL, the Butler - Authentication & Role Management
// ============================================

// DOM Elements
const lineLoginBtn = document.getElementById('line-login-btn');
const roleSection = document.getElementById('role-section');
const authSection = document.querySelector('.auth-section');

// ============================================
// Check for existing session (handles LINE redirect callback)
// ============================================
async function handleAuthState() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Session error:', error);
        return;
    }

    if (session) {
        // User is authenticated, check if they have a profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('line_user_id', session.user.id)
            .single();

        if (profile) {
            // User has a profile, redirect to their role page
            window.location.href = `${profile.role}.html`;
        } else if (profileError && profileError.code === 'PGRST116') {
            // No profile found, show role selection
            showRoleSelection();
        } else {
            console.error('Profile check error:', profileError);
        }
    }
    // If no session, show login button (default state)
}

// ============================================
// Show role selection section
// ============================================
function showRoleSelection() {
    if (authSection) authSection.classList.add('hidden');
    if (roleSection) roleSection.classList.remove('hidden');
}

// ============================================
// Handle LINE Login button click
// ============================================
if (lineLoginBtn) {
    lineLoginBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'line',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    });
}

// ============================================
// Handle Role Selection buttons
// ============================================
document.querySelectorAll('.btn-role').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        const selectedRole = btn.dataset.role;

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('User error:', userError);
            window.location.href = 'index.html';
            return;
        }

        // Create user profile with selected role
        const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                line_user_id: user.id,
                role: selectedRole,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

        if (insertError) {
            console.error('Profile creation error:', insertError);
            alert('Failed to create profile: ' + insertError.message);
            return;
        }

        // Redirect to role page
        window.location.href = `${selectedRole}.html`;
    });
});

// ============================================
// Role Access Check (for protected pages)
// Usage: const profile = await checkRoleAccess('administrator');
// ============================================
async function checkRoleAccess(requiredRole) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, timezone')
        .eq('line_user_id', session.user.id)
        .single();

    if (profileError || !profile) {
        window.location.href = 'index.html';
        return null;
    }

    if (profile.role !== requiredRole) {
        // Redirect to their actual role page
        window.location.href = `${profile.role}.html`;
        return null;
    }

    return profile;
}

// ============================================
// Logout function
// ============================================
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'index.html';
}

// ============================================
// Initialize on page load
// ============================================
handleAuthState();
