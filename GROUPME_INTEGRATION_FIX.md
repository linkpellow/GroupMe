# GroupMe OAuth Integration Fix

## Problem Description

Users were experiencing 500 errors when clicking "Connect GroupMe" in the sidebar. The integration page showed successful connections, but the sidebar flow kept failing.

## Root Causes Identified

1. **TypeScript Return Type Errors**:
   - Functions in `groupMe.controller.ts` were typed as returning `Promise<void>` but were returning `res.status()`, `res.json()`, etc.
   - This caused TypeScript compilation errors in the build process

2. **Authentication Middleware Issue**:
   - The `/api/groupme/callback` route (for implicit flow) was defined AFTER the `router.use(auth)` middleware
   - This meant the route was being protected by authentication, but it shouldn't be
   - When GroupMe redirects back with the access_token, there's no JWT token in the request
   - This was causing a JWT verification error: `JsonWebTokenError: jwt malformed`

3. **Path Mismatch**:
   - GroupMe was redirecting to `/groupme/callback` (frontend path)
   - Our API route was at `/api/groupme/callback` (backend path)
   - This path mismatch was causing the 404 errors

4. **OAuth Endpoint Mismatch**:
   - GroupMe uses implicit grant flow (returns access_token directly in URL)
   - Some frontend components were potentially using a cached URL with the old `/oauth/login_dialog` endpoint
   - The correct endpoint for implicit flow is `/oauth/authorize`

## Solution Implemented

1. **Fixed TypeScript Return Type Errors**:
   ```typescript
   // Changed from:
   export const getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
     // ...
     return res.status(200).json(config);
   };

   // Changed to:
   export const getConfig = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
     // ...
     return res.status(200).json(config);
   };
   ```

2. **Fixed Authentication Middleware Issue**:
   ```typescript
   // Moved the implicit grant callback route BEFORE the auth middleware
   router.get('/callback', groupMeController.handleGroupMeImplicitCallback);

   // Apply auth middleware for all other routes
   router.use(auth);
   ```

3. **Fixed Path Mismatch**:
   ```typescript
   // Added a direct route handler in the main Express app
   app.get('/groupme/callback', (req, res) => {
     console.log('Received GroupMe callback at /groupme/callback, forwarding to /api/groupme/callback');
     const { access_token, state } = req.query;
     const targetUrl = `/api/groupme/callback?access_token=${access_token}&state=${state}`;
     res.redirect(targetUrl);
   });
   ```

4. **Fixed OAuth Endpoint Issue**:
   ```typescript
   // Added validation and correction in frontend components
   if (authUrl.includes('login_dialog')) {
     console.warn('Detected outdated login_dialog endpoint, replacing with authorize endpoint');
     authUrl = authUrl.replace('login_dialog', 'authorize');
   }

   // Add cache-busting parameter
   authUrl = authUrl + (authUrl.includes('?') ? '&' : '?') + '_cb=' + Date.now();
   ```

## Testing and Verification

We created a test script (`test-groupme-oauth.js`) to simulate the GroupMe OAuth flow with a valid user ID. The test confirmed that:

1. The OAuth flow is correctly redirecting to GroupMe's authorization page
2. GroupMe is redirecting back to our callback URL with the access token
3. Our server is correctly processing the token and saving it to the database
4. The user is redirected to the success page

## Lessons Learned

1. GroupMe uses OAuth 2.0 implicit flow, which returns the access token directly in the URL
2. The correct endpoint for implicit flow is `/oauth/authorize`, not `/oauth/login_dialog`
3. The state parameter is essential for tracking the user ID during the OAuth flow
4. Public routes must be defined before the auth middleware in Express
5. When testing OAuth flows, always use a valid user ID from the database

## Deployment

The fix has been deployed to the staging environment and is ready for production deployment. 