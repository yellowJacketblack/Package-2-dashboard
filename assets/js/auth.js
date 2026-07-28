// ============================================
// GIRL, the Butler - Authentication & Role Management
// ============================================

// DOM Elements
const lineLoginBtn = document.getElementById('line-login-btn');
const roleSection = document.getElementById('role-section');
const authSection = document.querySelector('.auth-section');

// ============================================
// Extract LINE User ID from Supabase session
// The LINE User ID is stored in user_metadata,
// NOT in session.user.id (which is a Supabase UUID)
// ============================================
function getLineUserId(session) {
    if (!session || !session.user) return null;

    console.log('=== DEBUG: Session Found ===');
    console.log('Full user_metadata:', JSON.stringify(session.user.user_metadata, null, 2));
    console.log('Full app_metadata:', JSON.stringify(session.user.app_metadata, null, 2));
    const userId =
        session.user.user_metadata?.provider_id ||
        session.user.user_metadata?.sub ||
        session.user.user_metadata?.line_user_id ||
        session.user.app_metadata?.provider_id ||
        session.user.app_metadata?.sub ||
        null;

    if (!userId) {
        console.log('No LINE User ID found — using Supabase user ID for email user');
        return session.user.id;
    }

    return userId;
}

// ============================================
// Check for existing session (handles LINE redirect callback)
// ============================================
async function handleAuthState() {
    console.log('=== handleAuthState() called ===');

     // Handle email redirect / OAuth callback URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    const urlErrorDesc = urlParams.get('error_description');

    if (urlError) {
        console.error('Auth error from URL:', urlError, urlErrorDesc);
        alert('Login failed: ' + urlErrorDesc);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error('Session error:', error);
        return;
    }

    console.log('Session object:', session);
    
    if (!session) {
        // No session — show login button (default state)
        console.log('No session found — showing login button (default state)');
        return;
    }

    // Extract LINE User ID from session metadata
    const lineUserId = getLineUserId(session);

    if (!lineUserId) {
        console.error('No LINE User ID found in session. Cannot look up profile.');
        showPendingApproval();
        return;
    }

    console.log('Looking up profile for LINE User ID:', lineUserId);

    // Query user_profiles using the LINE User ID
    const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('role, timezone')
        .eq('line_user_id', lineUserId)
        .maybeSingle();

    if (profileError) {
        console.error('Profile query error:', profileError);
        return;
    }

    if (profile) {
        // User has a profile — sync timezone, then redirect
        await syncTimezone(lineUserId);

        const targetPage = `${profile.role}.html`;
        console.log(`Redirecting to: ${targetPage}`);
        window.location.href = targetPage;
    } else {
        // No profile found — show pending approval screen
        console.log('No profile found for LINE User ID:', lineUserId);
        showPendingApproval();
    }
}

// ============================================
// Show pending approval screen
// ============================================
function showPendingApproval() {
    if (authSection) authSection.classList.add('hidden');
    if (roleSection) roleSection.classList.remove('hidden');

    if (roleSection) {
        roleSection.innerHTML = `
            <div class="auth-card" style="max-width: 500px; margin: 0 auto;">
                <div class="auth-icon">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="#2d2d2d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="40" cy="40" r="30"/>
                        <path d="M40 20v20l15 10"/>
                    </svg>
                </div>
                <h1 style="font-size: 2rem; margin-bottom: 15px;">Awaiting Approval</h1>
                <p class="auth-description" style="margin-bottom: 30px;">
                    You've successfully authenticated with LINE, but your account
                    is pending administrator approval.<br><br>
                    Please contact the administrator to be assigned a role.
                </p>
                <button id="logout-btn" class="btn" style="background: #ff6b6b; color: white; width: 100%;">
                    Logout
                </button>
            </div>
        `;

        // Add logout button listener
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }
}

// ============================================
// Handle LINE Login button click
// ============================================
if (lineLoginBtn) {
    lineLoginBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'custom:LINE',
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
// Email Login Button - Show Modal
// ============================================
const emailLoginBtn = document.getElementById('email-login-btn');
const emailModal = document.getElementById('email-modal');
const closeModalBtn = document.getElementById('close-modal');
const emailLoginForm = document.getElementById('email-login-form');

if (emailLoginBtn) {
    emailLoginBtn.addEventListener('click', () => {
        if (emailModal) emailModal.classList.remove('hidden');
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (emailModal) emailModal.classList.add('hidden');
    });
}

// Close modal when clicking outside the content
if (emailModal) {
    emailModal.addEventListener('click', (e) => {
        if (e.target === emailModal) {
            emailModal.classList.add('hidden');
        }
    });
}

// ============================================
// Email Login Form Submit (Magic Link)
// ============================================
if (emailLoginForm) {
    emailLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;

        try {
            const { error } = await supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) throw error;

            // Show success message
            emailLoginForm.classList.add('hidden');
            document.getElementById('email-success').classList.remove('hidden');
        } catch (error) {
            console.error('Email login error:', error);
            alert('Error: ' + error.message);
        }
    });
}

// ============================================
// Sync device timezone to user_profiles
// NOTE: This only updates timezone and last_login.
// Users CANNOT modify their role or other profile fields.
// Only administrators can modify profiles.
// ============================================
async function syncTimezone(lineUserId) {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
        const { error } = await supabaseClient
            .from('user_profiles')
            .update({
                timezone: deviceTimezone,
                last_login: new Date().toISOString()
            })
            .eq('line_user_id', lineUserId);

        if (error) {
            console.log('Timezone sync skipped:', error.message);
        } else {
            console.log('Timezone synced:', deviceTimezone);
        }
    } catch (err) {
        console.log('Timezone sync error:', err);
    }
}

// ============================================
// Role Access Check (for protected pages)
// Usage: const profile = await checkRoleAccess('administrator');
// ============================================
async function checkRoleAccess(requiredRole) {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = 'index.html';
        return null;
    }

    // Extract LINE User ID from session metadata
    const lineUserId = getLineUserId(session);

    if (!lineUserId) {
        console.error('No LINE User ID found in session');
        window.location.href = 'index.html';
        return null;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('role, timezone')
        .eq('line_user_id', lineUserId)
        .maybeSingle();

    if (profileError || !profile) {
        // No profile = pending approval, send back to index
        window.location.href = 'index.html';
        return null;
    }

    if (profile.role !== requiredRole) {
        // Redirect to their actual role page
        window.location.href = `${profile.role}.html`;
        return null;
    }

    // Sync timezone if not yet set
    if (!profile.timezone) {
        await syncTimezone(lineUserId);
    }

    return profile;
}

// ============================================
// Logout function
// ============================================
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'index.html';
}

// ============================================
// Initialize on page load
// ============================================
handleAuthState();
