# Leads Sorting and Filtering Fix Summary

## Investigation Results

### Server-Side (✅ Working Correctly)

1. **Sorting by Date**:
   - `sortDirection=desc` (Newest First) - Working correctly
   - `sortDirection=asc` (Oldest First) - Working correctly
   - Dates range from 2025-05-26 (oldest) to 2025-05-30 (newest)

2. **Pipeline Source Filtering**:
   - `pipelineSource=marketplace` - Returns only Marketplace leads ✅
   - `pipelineSource=nextgen` - Returns only NextGen leads ✅
   - `pipelineSource=all` or no filter - Returns all leads ✅

3. **Combined Filtering & Sorting**:
   - Works correctly when both parameters are provided

### Database State

- **Marketplace leads**: ~2342 total (all imported from CSV)
- **NextGen leads**: 10 total (from API integration)
- **Self Generated leads**: 0 currently

### Client-Side Issues Found

1. **Parameter Mismatch** (Already Fixed):
   - Changed from `sources` to `pipelineSource` in queryTypes.ts

2. **Potential Issues to Check**:
   - React Query caching might show stale data
   - The dropdown menus might not be properly updating the query state
   - WebSocket authentication errors could prevent real-time updates

### WebSocket Authentication Issue

From the logs, there's a JWT signature mismatch:
```
Failed to parse WebSocket message or authenticate: JsonWebTokenError: invalid signature
```

This needs to be fixed to ensure real-time updates work properly.

## Next Steps

1. Test the UI thoroughly to ensure filters update the view
2. Fix the WebSocket JWT authentication issue
3. Ensure React Query properly refetches when filters change 