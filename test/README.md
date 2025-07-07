# GroupMe OAuth Test Scripts

This directory contains test scripts for the GroupMe OAuth integration.

## test-groupme-oauth.js

This script simulates the GroupMe OAuth flow to help test and diagnose issues with the OAuth integration.

### Usage

```bash
# Run with default settings (interactive mode)
node test-groupme-oauth.js

# Run in automated mode
TEST_MODE=automated node test-groupme-oauth.js

# Test against a different environment
BASE_URL=https://crokodial.com node test-groupme-oauth.js

# Test with a different user ID
TEST_USER_ID=your-user-id node test-groupme-oauth.js
```

### Environment Variables

- `BASE_URL`: The base URL of the API (default: `https://crokodial-api-staging-02dd9c87e429.herokuapp.com`)
- `TEST_USER_ID`: The user ID to use for testing (default: `685f46719f3db89e5333341e`)
- `CLIENT_ID`: The GroupMe client ID (default: `6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66`)
- `TEST_MODE`: The test mode (`interactive` or `automated`, default: `interactive`)

### Test Modes

- **Interactive Mode**: Opens a browser for manual testing of the OAuth flow
- **Automated Mode**: Tests the API endpoints without opening a browser

### What the Script Tests

1. **OAuth Initiate Endpoint**: Tests the `/api/groupme/oauth/initiate` endpoint
2. **OAuth Callback Endpoint**: Tests the `/api/groupme/callback` endpoint
3. **Full OAuth Flow**: Tests the complete OAuth flow from initiation to callback

### Example Output

```
=== GroupMe OAuth Flow Test ===
Base URL: https://crokodial-api-staging-02dd9c87e429.herokuapp.com
Test User ID: 685f46719f3db89e5333341e
Client ID: 6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66
Test Mode: interactive
-----------------------------------
Auth URL: https://oauth.groupme.com/oauth/authorize?client_id=6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66&redirect_uri=https%3A%2F%2Fcrokodial-api-staging-02dd9c87e429.herokuapp.com%2Fgroupme%2Fcallback&state=eyJ1c2VySWQiOiI2ODVmNDY3MTlmM2RiODllNTMzMzM0MWUiLCJ0aW1lc3RhbXAiOjE3NTE4NDk3NjQyMzR9
State parameter: eyJ1c2VySWQiOiI2ODVmNDY3MTlmM2RiODllNTMzMzM0MWUiLCJ0aW1lc3RhbXAiOjE3NTE4NDk3NjQyMzR9
State decoded: {"userId":"685f46719f3db89e5333341e","timestamp":1751849764234}

Opening browser for authentication...
Please complete the authentication process in the browser.
After authentication, you will be redirected to the success page.
Open browser to test OAuth flow? (y/n): y

Browser opened. Please complete the authentication process.

After authentication, check the server logs for success or error messages.

Testing callback endpoint directly...
Testing callback endpoint directly...
Callback redirected as expected to: /integrations/groupme/success
```

### Troubleshooting

If you encounter any issues:

1. Check that the user ID exists in the database
2. Verify that the GroupMe client ID is correct
3. Check the server logs for detailed error messages
4. Ensure the server is running and accessible 