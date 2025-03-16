/**
 * GoogleAuthFix - An enhanced utility to handle race conditions in Google OAuth callbacks
 * 
 * This script detects Google callback URLs and automatically retries them when they fail,
 * with improved error handling, adaptive retry timing, and better synchronization with
 * the backend's readiness state.
 */

// Initialize the fix when the module is imported
initGoogleAuthFix();

/**
 * Initialize the Google Auth Fix
 */
function initGoogleAuthFix() {
  // Only run in the browser
  if (typeof window === 'undefined') return;

  console.log('🔐 Google Auth Fix: Initializing');
  
  // Listen for callback URLs in location changes
  if (window.location.href.includes('/api/auth/google/callback')) {
    console.log('🔐 Google Auth Fix: Detected callback URL, applying fix');
    handleCallbackUrl();
  }
  
  // Listen for navigation events (for SPA navigation)
  window.addEventListener('popstate', checkForCallbackUrl);
  
  // For SPAs, also check when the URL changes without a full page load
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    checkForCallbackUrl();
  };
  
  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    checkForCallbackUrl();
  };
}

/**
 * Check if the current URL is a Google callback URL
 */
function checkForCallbackUrl() {
  if (window.location.href.includes('/api/auth/google/callback')) {
    console.log('🔐 Google Auth Fix: Detected callback URL via navigation event');
    handleCallbackUrl();
  }
}

/**
 * Handle a Google callback URL by automatically retrying on 404 errors
 */
function handleCallbackUrl() {
  const callbackUrl = window.location.href;
  
  // Only proceed if this looks like a genuine Google callback (has code parameter)
  if (!callbackUrl.includes('code=')) return;
  
  console.log('🔐 Google Auth Fix: Processing callback URL');
  
  // Store the URL in localStorage to track it
  localStorage.setItem('google_auth_callback_url', callbackUrl);
  localStorage.setItem('google_auth_callback_time', Date.now());
  
  // Check if we've already tried this exact URL
  const retryCount = parseInt(localStorage.getItem('google_auth_callback_retries') || '0');
  localStorage.setItem('google_auth_callback_retries', (retryCount + 1).toString());
  
  // Only retry up to 3 times to prevent infinite loops
  if (retryCount >= 3) {
    console.log('🔐 Google Auth Fix: Maximum retries reached, giving up');
    localStorage.removeItem('google_auth_callback_url');
    localStorage.removeItem('google_auth_callback_time');
    localStorage.removeItem('google_auth_callback_retries');
    return;
  }
  
  // Calculate adaptive delay based on retry count with exponential backoff
  const getBackoffDelay = (attempt) => {
    const baseDelay = 300; // Start with 300ms
    return Math.min(baseDelay * Math.pow(1.5, attempt), 3000); // Cap at 3 seconds
  };
  
  // Set up a fetch request to check the callback URL
  console.log('🔐 Google Auth Fix: Making request to callback URL');
  
  // First make a HEAD request to check server readiness
  fetch(callbackUrl.split('?')[0], {
    method: 'HEAD',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
  .then(headResponse => {
    console.log(`🔐 Google Auth Fix: HEAD request status: ${headResponse.status}`);
    
    // Now make the actual GET request for the callback
    return fetch(callbackUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  })
  .then(response => {
    console.log(`🔐 Google Auth Fix: Callback response status: ${response.status}`);
    
    if (response.ok) {
      console.log('🔐 Google Auth Fix: Callback URL processed successfully');
      // Success - clean up
      localStorage.removeItem('google_auth_callback_url');
      localStorage.removeItem('google_auth_callback_time');
      localStorage.removeItem('google_auth_callback_retries');
      
      return response.text().then(text => {
        // If we got HTML back and it seems to be a success page, we're done
        if (text.includes('success') || text.includes('token')) {
          console.log('🔐 Google Auth Fix: Authentication successful');
        } else {
          // Otherwise, reload the page to process the response
          window.location.reload();
        }
      });
    } else if (response.status === 404 || response.status === 503) {
      // 404 Not Found or 503 Service Unavailable - retry with backoff
      console.log(`🔐 Google Auth Fix: ${response.status} detected, applying automatic retry with backoff`);
      
      const delay = getBackoffDelay(retryCount);
      console.log(`🔐 Google Auth Fix: Retrying in ${delay}ms (attempt ${retryCount + 1})`);
      
      // Wait a moment and reload the exact same URL
      setTimeout(() => {
        // Add a forced retry parameter to bypass caching
        const retrySeparator = callbackUrl.includes('?') ? '&' : '?';
        const retryUrl = `${callbackUrl}${retrySeparator}_retry=${Date.now()}`;
        
        console.log('🔐 Google Auth Fix: Retrying with URL:', retryUrl);
        window.location.href = retryUrl;
      }, delay);
    } else {
      console.log('🔐 Google Auth Fix: Unexpected status:', response.status);
      // For other errors, just reload after a short delay
      setTimeout(() => window.location.reload(), 1000);
    }
  })
  .catch(error => {
    console.log('🔐 Google Auth Fix: Network error, retrying', error);
    // For network errors, retry with backoff
    const delay = getBackoffDelay(retryCount);
    setTimeout(() => window.location.reload(), delay);
  });
  
  // No need for xhr.send() as we're using fetch now
}

// Check on page load if we're returning from a failed callback
window.addEventListener('load', function() {
  if (window.location.pathname === '/login') {
    // Check if we were redirected from a Google callback
    const callbackUrl = localStorage.getItem('google_auth_callback_url');
    const callbackTime = parseInt(localStorage.getItem('google_auth_callback_time') || '0');
    
    // Only consider recent callbacks (within the last 10 seconds)
    if (callbackUrl && (Date.now() - callbackTime < 10000)) {
      console.log('🔐 Google Auth Fix: Detected redirect from callback to login, retrying callback');
      
      // Wait a moment and retry the callback
      setTimeout(() => {
        // Add a timestamp to force a fresh request
        const retrySeparator = callbackUrl.includes('?') ? '&' : '?';
        const retryUrl = `${callbackUrl}${retrySeparator}_retry=${Date.now()}`;
        
        console.log('🔐 Google Auth Fix: Retrying callback URL:', retryUrl);
        window.location.href = retryUrl;
      }, 500);
    }
  }
});

export default {
  isActive: true
};
