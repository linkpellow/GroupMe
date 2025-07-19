# NextGen Premium Listing Deduplication

## Overview
NextGen sends two CSV files per purchase:
1. **Main lead file** - Contains the base lead data with base price
2. **Premium listing file** - Contains only the $5 upsell price for premium placement

## Business Rules
- Only ONE lead should exist per person
- Premium listing price ($5) should be ADDED to the base price
- Never create duplicate leads for premium listings
- Main lead record (product="data") takes precedence over ad record (product="ad")

## Technical Implementation

### Field Identification
The system identifies record types using the `product` field:
- `product = "data"` → Main lead record
- `product = "ad"` → Premium listing ($5 upsell)

Both records share the same `lead_id` for matching.

### Deduplication Logic
Located in: `dialer-app/server/src/routes/csvUpload.routes.ts`

```typescript
// Key deduplication logic:
if (parseResult.vendor === 'NEXTGEN') {
  const dedupMap = new Map<string, any>();
  let premiumListingCount = 0;
  
  for (const lead of parseResult.leads) {
    const key = lead.leadId || lead.phone || lead.email;
    
    if (dedupMap.has(key)) {
      // Handle merging based on product types
      // Always keep 'data' record as main lead
      // Add premium price to total
    }
  }
}
```

### Price Calculation
- Base lead price: From the "data" record
- Premium listing: $5 from the "ad" record
- Total price: Base + Premium

### Example
```
Input CSV Records:
1. lead_id: D-4KXN-4SC5, product: "ad", price: 5
2. lead_id: D-4KXN-4SC5, product: "data", price: 45

Output (Single Lead):
- lead_id: D-4KXN-4SC5
- price: 50 (45 + 5)
- notes: "💎 Premium Listing Applied:
         Base Price: $45
         Premium Listing: $5
         Total Price: $50"
```

## Lead Notes
When a premium listing is merged, the system automatically adds a note to the lead:

```
💎 Premium Listing Applied:
Base Price: $45
Premium Listing: $5
Total Price: $50
```

## Logging
The system logs all premium listing merges:
```
[NextGen Import] Merged premium listing for lead D-4KXN-4SC5: +$5 = $50 total
[NextGen Import] Processed 3 premium listings
```

## Edge Cases Handled
1. **Ad record appears before data record**: System correctly identifies and merges
2. **Missing premium listing**: Lead imports normally with base price only
3. **Duplicate records of same type**: Prices are summed with a warning logged

## Testing
Test file: `dialer-app/server/__tests__/nextgenPremiumListing.test.ts`

Run tests:
```bash
cd dialer-app/server
npm test nextgenPremiumListing
```

## Monitoring
Watch for these log messages during imports:
- `[NextGen Import] Merged premium listing...` - Successful merge
- `[NextGen Import] Duplicate ... record for lead` - Potential data issue
- `[NextGen Import] Processed X premium listings` - Summary count 