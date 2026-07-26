// 'Package 2/assets/timezone.js'
function detectDeviceTimezone() {
    // This reads the device's system clock timezone setting
    // Works on iOS, Android, Windows, Mac, Linux - any modern browser
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Also get the UTC offset in minutes (for fallback calculations)
    const offsetMinutes = new Date().getTimezoneOffset();
    
    return {
        timezone: timezone,           // e.g., "Asia/Tokyo", "America/New_York"
        offsetMinutes: offsetMinutes  // e.g., -540 for UTC+9
    };
}

// Send timezone to Supabase on login
async function updateTimezoneOnLogin(lineUserId) {
    const { timezone, offsetMinutes } = detectDeviceTimezone();
    
    // Store in browser localStorage for immediate UI use
    localStorage.setItem('device_timezone', timezone);
    localStorage.setItem('device_offset', offsetMinutes.toString());
    
    // Update Supabase user_profiles table
    const { error } = await supabase
        .from('user_profiles')
        .update({ 
            timezone: timezone,
            last_login: new Date().toISOString()
        })
        .eq('line_user_id', lineUserId);
    
    if (error) console.error('Failed to update timezone:', error);
}

// Format a UTC timestamp according to device timezone
function formatToLocalTime(utcTimestamp) {
    const deviceTz = localStorage.getItem('device_timezone') || 
                     Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return new Date(utcTimestamp).toLocaleString('en-US', {
        timeZone: deviceTz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
