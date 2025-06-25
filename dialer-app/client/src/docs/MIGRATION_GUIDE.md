# Migration Guide: Integrating the New Query System

This guide explains how to integrate the new centralized query system into the existing Leads component.

## Overview

The new query system provides:

- Centralized query state management
- Automatic URL synchronization
- Server-side query optimization
- Request deduplication
- Smart caching and prefetching
- Full TypeScript support

## Step 1: Import the New Hook

Replace the old imports in `Leads.tsx`:

```typescript
// OLD
import { useQuery } from "@tanstack/react-query";

// NEW - Add this import
import { useLeadsPageData } from "../hooks/useLeadsPageData";
```

## Step 2: Replace the Query Logic

Replace the existing query logic with the new hook:

```typescript
// OLD
const {
  data: leadsData,
  isLoading: queryLoading,
  error,
} = useQuery<LeadsResponse>({
  queryKey: ["leads"],
  queryFn: () => {
    /* ... */
  },
  // ...
});

// NEW
const {
  leads,
  isLoading,
  error,
  totalLeads,
  totalPages,
  currentPage,
  availableStates,
  availableDispositions,
  refetch,
  setCurrentPage,
  setSearchQuery,
  setSelectedStates,
  setSelectedDispositions,
  setSortDirection,
  setSelectedPipeline,
  queryState,
} = useLeadsPageData();
```

## Step 3: Update State Management

Remove the following state declarations as they're now managed by the hook:

```typescript
// REMOVE these:
const [searchQuery, setSearchQuery] = useState<string>("");
const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [selectedStates, setSelectedStates] = useState<string[]>([]);
const [selectedDispositions, setSelectedDispositions] = useState<string[]>([]);
```

## Step 4: Update Filter Handlers

Replace the filter change handlers:

```typescript
// OLD
const handleStateChange = (newStates: string[]) => {
  setSelectedStates(newStates);
  // manual refetch logic
};

// NEW
const handleStateChange = (newStates: string[]) => {
  setSelectedStates(newStates);
  // That's it! The hook handles everything else
};
```

## Step 5: Update Pagination

Replace the pagination handlers:

```typescript
// OLD
const handlePrevPage = () => {
  if (currentPage > 1) {
    const newPage = currentPage - 1;
    setIsLoading(true);
    // manual API call
  }
};

// NEW
const handlePrevPage = () => {
  setCurrentPage(currentPage - 1);
  // The hook handles loading states and API calls
};
```

## Step 6: Remove Manual Search Logic

The new system handles search automatically:

```typescript
// OLD - Complex search effect with manual API calls
useEffect(() => {
  if (!searchQuery.trim()) {
    // manual logic
  } else {
    // manual search API call
  }
}, [searchQuery, /* ... */]);

// NEW - Just update the search query
<input
  value={queryState.queryState.search}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

## Step 7: Update the Leads Display

The leads are now directly available:

```typescript
// OLD
const leadsToDisplay = searchQuery ? filteredLeads : leads;

// NEW
// Just use 'leads' directly - it already includes search/filter results
{leads.map(lead => (
  <LeadCard key={lead._id} lead={lead} />
))}
```

## Benefits After Migration

1. **Automatic URL Sync**: All filters/search are reflected in the URL
2. **Better Performance**: Automatic request deduplication and caching
3. **Simpler Code**: Remove hundreds of lines of manual state management
4. **Type Safety**: Full TypeScript support with validation
5. **Better UX**: Debounced search, prefetched pagination
6. **Easy to Extend**: Add new filters by updating the config

## Troubleshooting

### Issue: Filters not updating

Make sure you're using the setter functions from the hook, not local state.

### Issue: Search feels slow

The search is debounced by 300ms by default. This can be adjusted in `queryConfig.ts`.

### Issue: Missing filter options

The `availableStates` and `availableDispositions` are fetched from the server. Check the network tab.

## Full Example

Here's a minimal example of the migrated component:

```typescript
import { useLeadsPageData } from '../hooks/useLeadsPageData';

export default function Leads() {
  const {
    leads,
    isLoading,
    error,
    totalLeads,
    totalPages,
    currentPage,
    availableStates,
    availableDispositions,
    setCurrentPage,
    setSearchQuery,
    setSelectedStates,
    setSelectedDispositions,
    queryState
  } = useLeadsPageData();

  if (isLoading) return <LoadingCroc />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={queryState.queryState.search}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search leads..."
      />

      {/* State Filter */}
      <MultiStateFilter
        selectedStates={queryState.queryState.filters.states}
        onChange={setSelectedStates}
        availableStates={availableStates}
      />

      {/* Disposition Filter */}
      <MultiDispositionFilter
        selectedDispositions={queryState.queryState.filters.dispositions}
        onChange={setSelectedDispositions}
        availableDispositions={availableDispositions}
      />

      {/* Leads List */}
      <div>
        {leads.map(lead => (
          <LeadCard key={lead._id} lead={lead} />
        ))}
      </div>

      {/* Pagination */}
      <div>
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Next Steps

After migration, you can:

1. Add new filters by updating `queryConfig.ts`
2. Customize debounce delays
3. Add performance monitoring
4. Export filtered results
5. Save filter presets

The new system is designed to be extensible and maintainable while providing better performance and user experience.
