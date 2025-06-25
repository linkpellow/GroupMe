/**
 * Utility to clear all authentication data
 * This ensures no old JWT tokens cause issues
 */

export const clearAllAuthData = () => {
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear all cookies
  document.cookie.split(';').forEach((c) => {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });

  console.log('All authentication data cleared');
};

// Check for JWT mismatch on startup
export const checkJWTValidity = () => {
  const token = localStorage.getItem('token');
  if (token) {
    // If we detect an old token pattern, clear everything
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const issuedAt = payload.iat;
      const currentTime = Math.floor(Date.now() / 1000);

      // If token is older than 1 day, clear it (likely from old JWT_SECRET)
      if (currentTime - issuedAt > 86400) {
        console.log('Detected old JWT token, clearing auth data...');
        clearAllAuthData();
        window.location.reload();
      }
    } catch (error) {
      console.error('Invalid token format, clearing auth data...');
      clearAllAuthData();
      window.location.reload();
    }
  }
};
