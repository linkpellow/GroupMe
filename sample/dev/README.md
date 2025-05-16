# Development and Testing Utilities

This directory contains HTML files used for development and testing purposes. These are not part of the main application and should not be deployed to production.

## Files

### test-auth.html
A simple HTML page for testing authentication against the API. It allows you to:
- Test login functionality
- Test database connectivity
- View API responses

### update-groupme-config.html
A utility for updating GroupMe configuration in the browser's localStorage. Features:
- Updates the GroupMe access token
- Configures the GroupMe group IDs
- Shows success messages and instructions

### fix-groupme-browser.html
Another utility for fixing GroupMe configuration issues. It provides:
- A button to directly set the GroupMe configuration
- Manual instructions for console-based fixes
- Configuration verification

## Usage

These files should be opened directly in a browser while developing or testing the application. They are not meant to be part of the regular application flow.

**Note:** These files contain hardcoded credentials and configuration which should be replaced with actual values in a production environment. 