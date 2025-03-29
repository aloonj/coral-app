/**
 * GoogleAuthFix - Simplified utility to handle Google OAuth callbacks
 * 
 * This script detects both initial Google auth URLs and callback URLs and 
 * immediately reloads them when they appear to fail.
 */

// Initialize the fix when the module is imported
initGoogleAuthFix();

// Track if this script has already done a reload to prevent infinite loops
let didReload = false;

/**
 * Initialize the Google Auth Fix
 */
function initGoogleAuthFix() {
  // Only run in the browser
  if (typeof window === 'undefined') return;

  console.log('🔐 Google Auth Fix: Initializing');
  
  // Detect if we're on a Google auth page (either initial auth or callback)
  if (window.location.href.includes('/api/auth/google')) {
    // Special function that runs once DOM is fully loaded
    if (document.readyState === 'complete') {
      checkAndHandleGoogleAuthPage();
    } else {
      window.addEventListener('load', checkAndHandleGoogleAuthPage);
    }
  }
}

/**
 * Check if current page is a Google auth page and handle issues
 */
function checkAndHandleGoogleAuthPage() {
  const currentUrl = window.location.href;
  console.log('🔐 Google Auth Fix: Checking page:', currentUrl);
  
  // If this is a callback URL with code parameter
  if (currentUrl.includes('/api/auth/google/callback') && currentUrl.includes('code=')) {
    console.log('🔐 Google Auth Fix: Detected callback URL');
    handleCallbackPage();
  } 
  // If this is the initial Google auth URL
  else if (currentUrl.includes('/api/auth/google?')) {
    console.log('🔐 Google Auth Fix: Detected initial auth URL');
    handleInitialAuthPage();
  }
}

/**
 * Handle Google callback URL issues
 */
function handleCallbackPage() {
  // Check if this page loaded as expected
  if (document.title.includes('Error') || document.body.textContent.includes('Error') || 
      document.body.textContent.includes('not found') || document.body.textContent.includes('404')) {
    
    if (didReload) {
      console.log('🔐 Google Auth Fix: Already attempted reload, not trying again');
      return;
    }
    
    console.log('🔐 Google Auth Fix: Callback page appears to have errors, reloading');
    
    // Mark that we've done a reload to prevent infinite loops
    didReload = true;
    
    // Add a forced retry parameter to bypass caching
    const currentUrl = window.location.href;
    const retrySeparator = currentUrl.includes('?') ? '&' : '?';
    const retryUrl = `${currentUrl}${retrySeparator}_retry=${Date.now()}`;
    
    console.log('🔐 Google Auth Fix: Reloading with URL:', retryUrl);
    window.location.replace(retryUrl);
  } else {
    console.log('🔐 Google Auth Fix: Callback page appears normal');
  }
}

/**
 * Handle initial Google auth page issues
 */
function handleInitialAuthPage() {
  // Check if this page loaded as expected - it should redirect, not show content
  if (document.title.includes('Error') || document.body.textContent.includes('Error') || 
      document.body.textContent.includes('not found') || document.body.textContent.includes('404')) {
    
    if (didReload) {
      console.log('🔐 Google Auth Fix: Already attempted reload, not trying again');
      return;
    }
    
    console.log('🔐 Google Auth Fix: Auth page appears to have errors, reloading');
    
    // Mark that we've done a reload to prevent infinite loops
    didReload = true;
    
    // Add a forced retry parameter to bypass caching
    const currentUrl = window.location.href;
    const retrySeparator = currentUrl.includes('?') ? '&' : '?';
    const retryUrl = `${currentUrl}${retrySeparator}_retry=${Date.now()}`;
    
    console.log('🔐 Google Auth Fix: Reloading with URL:', retryUrl);
    window.location.replace(retryUrl);
  } else {
    console.log('🔐 Google Auth Fix: Auth page appears normal');
  }
}

// Global check for failed page loads
window.addEventListener('load', function() {
  const url = window.location.href;
  
  // If we're on the login page, check if we got redirected here from a Google auth flow
  if (window.location.pathname === '/login' && !didReload) {
    // If the URL has an error parameter related to Google auth, try again
    if (url.includes('error=') && 
        (url.includes('Google') || url.includes('auth') || url.includes('Authentication'))) {
      
      console.log('🔐 Google Auth Fix: Detected failed Google auth, retrying from login page');
      
      // Retry the Google auth flow (fresh attempt)
      setTimeout(() => {
        // Prevent infinite loops by adding a flag to localStorage
        if (!localStorage.getItem('google_auth_retry_count')) {
          localStorage.setItem('google_auth_retry_count', '1');
          console.log('🔐 Google Auth Fix: Retrying Google auth');
          window.location.href = `/api/auth/google?retry=${Date.now()}`;
        } else {
          console.log('🔐 Google Auth Fix: Not retrying - already attempted');
          localStorage.removeItem('google_auth_retry_count');
        }
      }, 500);
    }
  }
});

// Clean up on navigation
window.addEventListener('beforeunload', function() {
  localStorage.removeItem('google_auth_retry_count');
});

export default {
  isActive: true,
  didReload
};
