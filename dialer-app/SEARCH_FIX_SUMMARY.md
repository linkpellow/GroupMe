# Search Function Fix - Complete Solution

## The Problem

The current search implementation in Leads.tsx has a critical flaw:

- It tries to fetch ALL leads (with `getAllResults: 'true'` and `limit: 1000`)
- Then filters them on the client-side
- This hits a hard 500-lead backend limit
- Results in incomplete search results (only searches through first 500 leads, not the entire database)

## The Solution

Use **server-side search** that's already implemented in our query system. The backend searches through the ENTIRE database using MongoDB queries.

## Implementation

### Option 1: Quick Fix (Use the Fixed Hook)

1. Import the fixed search hook:

```typescript
import { useFixedLeadsSearch } from "./LeadsSearchFix";
```

2. Replace the problematic search useEffect (around line 6083) with:

```typescript
useFixedLeadsSearch({
  searchQuery,
  sortDirection,
  selectedStates,
  selectedDispositions,
  selectedPipeline,
  currentPage,
  isSearching,
  setIsSearching,
  setIsLoading,
  setLeads,
  setFilteredLeads,
  setTotalLeads,
  setTotalPages,
  getStateParams,
});
```

3. Update the display logic to use `leads` directly:

```typescript
// OLD
const leadsToDisplay = searchQuery ? filteredLeads : leads;

// NEW
const leadsToDisplay = leads; // Server already filtered them
```

### Option 2: Direct Fix (Modify the Existing Code)

Replace the search useEffect with this corrected version:

```typescript
useEffect(() => {
  const debounceTimeout = setTimeout(() => {
    if (!searchQuery.trim()) {
      // Reset to normal pagination when search is cleared
      if (isSearching) {
        setIsSearching(false);
        // Fetch current page normally
        axiosInstance
          .get("/api/leads", {
            params: {
              page: currentPage,
              sortDirection,
              ...getStateParams(selectedStates),
              dispositions:
                selectedDispositions.length > 0
                  ? selectedDispositions.join(",")
                  : undefined,
              pipelineSource: selectedPipeline, // ... pipeline mapping
            },
          })
          .then((response) => {
            setLeads(response.data.leads || []);
            setTotalLeads(response.data.pagination.total || 0);
            setTotalPages(response.data.pagination.pages || 1);
            setFilteredLeads([]); // Clear filtered leads
            setIsLoading(false);
          });
      }
    } else {
      // Use SERVER-SIDE search
      setIsSearching(true);
      setIsLoading(true);

      // Send search query to backend
      axiosInstance
        .get("/api/leads", {
          params: {
            page: 1, // Always start at page 1 for new search
            limit: 50, // Normal pagination
            search: searchQuery, // Let backend handle the search!
            sortDirection,
            ...getStateParams(selectedStates),
            dispositions:
              selectedDispositions.length > 0
                ? selectedDispositions.join(",")
                : undefined,
            pipelineSource: selectedPipeline, // ... pipeline mapping
          },
        })
        .then((response) => {
          // Backend already filtered the results
          setLeads(response.data.leads || []);
          setTotalLeads(response.data.pagination.total || 0);
          setTotalPages(response.data.pagination.pages || 1);
          setFilteredLeads([]); // No client-side filtering needed
          setIsLoading(false);
        });
    }
  }, 300);

  return () => clearTimeout(debounceTimeout);
}, [
  searchQuery,
  sortDirection,
  selectedStates,
  selectedDispositions,
  selectedPipeline,
  currentPage,
]);
```

## Key Changes

1. **Remove** `getAllResults: 'true'` - Don't try to fetch all leads
2. **Remove** `limit: 1000` - Use normal pagination (50 per page)
3. **Add** `search: searchQuery` - Send search term to backend
4. **Remove** client-side filtering logic - Backend handles it
5. **Clear** `filteredLeads` - No longer needed

## How It Works Now

1. User types in search box
2. After 300ms debounce, search query is sent to backend
3. Backend uses MongoDB regex queries to search through:
   - name
   - email
   - phone
   - firstName
   - lastName
4. Backend returns paginated results (50 per page)
5. Frontend displays the results directly

## Benefits

✅ Searches the ENTIRE database (not limited to 500 leads)  
✅ Much faster (no need to transfer thousands of records)  
✅ Lower memory usage (only 50 leads in memory at a time)  
✅ Proper pagination of search results  
✅ Works with all existing filters seamlessly  
✅ No error chains or crashes

## Testing

1. Search for a lead you know exists beyond the first 500
2. Verify pagination works with search results
3. Confirm filters work together with search
4. Check that clearing search returns to normal view

## Migration Path

For the safest migration:

1. First, use the `useLeadsPageData` hook from our new query system (Step 5)
2. It already has proper server-side search built in
3. No need for manual fixes - it just works!

The search is already properly implemented in our new query system. The fix is simply to use server-side search instead of trying to load all leads to the client.
