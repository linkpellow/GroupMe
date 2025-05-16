# Server Files Organization Plan

## Current Issues
- Multiple server files with overlapping functionality
- No clear naming convention for different server purposes
- Confusing for development and maintenance

## Consolidation Plan

### 1. Main Application Server
**File:** `dialer-app/server/server.js`
- Keep this as the primary production server
- Add proper routing structure from Express Router
- Consolidate all API endpoints here

### 2. Development Testing Server
**File:** `dev-server.js` (rename from server.cjs)
- Purpose: Development and testing with mock data
- Clearly labeled as development-only

### 3. Specialized Service Servers
**File:** `upload-server.js` 
- Keep specialized for file upload handling
- Rename to `file-service.js` for clarity

**File:** `groupme-service.js` (rename from minimal-groupme-server.js)
- GroupMe specific functionality
- Moved to standard location

### 4. Files to Delete
- `simple-server.js` (redundant with dev-server.js)
- `minimal-server.js` (empty file)

## Implementation Steps
1. Move specialized servers to a `services/` directory
2. Update import/require statements in dependent files
3. Update package.json scripts to use the new file names
4. Document the purpose of each server in README.md
5. Update startup scripts to launch the correct server based on environment

This organization will make it clear which server to use for what purpose and reduce confusion in development. 