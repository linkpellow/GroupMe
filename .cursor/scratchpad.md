# NextGen Premium Merge Logic - Webhook Integration Plan

## Objective
Ensure webhook-ingested NextGen leads follow the same deduplication rules as CSV imports:
- One lead per person per purchase
- Premium listings ($5 upsell) merge with existing leads
- Consistent behavior across all ingestion methods

## Current State Analysis

### CSV Import (Already Implemented ✅)
- Location: `dialer-app/server/src/routes/csvUpload.routes.ts`
- Logic: Deduplicates by lead_id, merges premium listings, sums prices
- Identifies records by `product` field: "data" vs "ad"

### Webhook Endpoint (Now Updated ✅)
- Location: `dialer-app/server/src/routes/webhook.routes.ts`
- ✅ Creates/updates leads with premium listing logic
- ✅ Deduplication for ad/data records implemented
- ✅ Price summing works correctly

## Implementation Plan

### Phase 1: Create Shared Deduplication Service ✅ COMPLETE

1. **Create Shared Utility** ✅
   - File: `dialer-app/server/src/services/nextgenDeduplicationService.ts`
   - Purpose: Centralize premium listing merge logic
   - Functions:
     - `processNextGenLead(leadData, existingLead?)` ✅
     - `isPremiumListing(lead)` ✅
     - `mergeWithPremium(baseLead, premiumData)` ✅

2. **Extract Logic from CSV Handler** ✅
   - Moved deduplication logic to shared service
   - Updated CSV handler to use new service
   - Maintained backward compatibility

### Phase 2: Update Webhook Handler ✅ COMPLETE

1. **Modify adaptNextGenLead Function** ✅
   - Product field already passed through
   - Price information preserved

2. **Enhance Webhook Processing** ✅
   - Before creating/updating lead, checks for existing lead
   - Applies deduplication logic for premium listings
   - Handles both scenarios:
     - Premium arrives after main lead ✅
     - Premium arrives before main lead ✅

3. **Update Lead Creation Logic** ✅
   - Uses shared service for all NextGen leads
   - Ensures proper price aggregation
   - Adds premium listing notes

### Phase 3: Testing Strategy ✅ COMPLETE

1. **Unit Tests** ✅
   - Created `__tests__/nextgenDeduplicationService.test.ts`
   - Tests all deduplication scenarios
   - Tests price aggregation logic

2. **Integration Tests** ✅
   - Created `__tests__/nextgenWebhookIntegration.test.ts`
   - Tests webhook with main→premium flow
   - Tests webhook with premium→main flow
   - Tests duplicate scenarios

3. **Test Results** ✅
   - All 14 tests passing
   - Coverage includes all edge cases
   - Logging verified working

### Phase 4: Implementation Details ✅ COMPLETE

1. **Shared Service Structure** ✅
   ```typescript
   interface NextGenDeduplicationResult {
     action: 'create' | 'update' | 'skip';
     leadData: any;
     notes?: string;
     priceBreakdown?: {
       base: number;
       premium: number;
       total: number;
     };
   }
   ```

2. **Webhook Integration Points** ✅
   - Checks existing lead by: nextgenId, phone, or email
   - Applies merge logic before upsertLead
   - Logs all premium merges for audit

3. **Data Consistency** ✅
   - Same fields used for deduplication across CSV and webhook
   - Price history maintained in notes
   - All original data preserved

### Phase 5: Documentation & Monitoring ✅ COMPLETE

1. **Update Documentation** ✅
   - Updated `NEXTGEN_PREMIUM_LISTING.md` with webhook behavior
   - Updated `NEXTGEN_WEBHOOK_MAPPING.md` with premium listing section
   - Added troubleshooting guide

2. **Logging & Monitoring** ✅
   - All deduplication decisions logged
   - Premium listing merges tracked
   - Warnings for unusual patterns

### Phase 6: Rollout Plan 🚀 READY

1. **Deployment Steps**
   - ✅ Code complete and tested
   - ✅ Documentation updated
   - Ready for staging deployment
   - Monitor for 24 hours before production

2. **Rollback Strategy**
   - Changes are isolated and reversible
   - Original webhook behavior preserved in git history

## Success Criteria ✅ ALL MET

- ✅ No duplicate leads from webhook + CSV combinations
- ✅ Premium listings correctly add $5 to existing leads
- ✅ All tests pass (unit + integration) - 14/14 passing
- ✅ No regression in non-NextGen webhooks
- ✅ Clear audit trail in logs
- ✅ Documentation updated

## Risk Assessment

- **Low Risk**: Changes isolated to NextGen leads ✅
- **Medium Risk**: Webhook timing (concurrent requests) - Mitigated with proper DB operations
- **Mitigation**: Transaction-like processing implemented

## Lessons Learned

1. **Product Field Already Mapped**: The webhook adapter already included the product field, saving implementation time
2. **Type Safety**: Had to use type assertions for Lead._id due to TypeScript strictness
3. **Testing Strategy**: Mocking database interactions was more efficient than using in-memory DB
4. **Shared Service Benefits**: Centralizing logic ensures consistency and makes testing easier

## Implementation Summary

### Files Created/Modified:
1. ✅ `dialer-app/server/src/services/nextgenDeduplicationService.ts` - Shared deduplication logic
2. ✅ `dialer-app/server/src/routes/csvUpload.routes.ts` - Updated to use shared service
3. ✅ `dialer-app/server/src/routes/webhook.routes.ts` - Enhanced with deduplication
4. ✅ `dialer-app/server/__tests__/nextgenDeduplicationService.test.ts` - Unit tests
5. ✅ `dialer-app/server/__tests__/nextgenWebhookIntegration.test.ts` - Integration tests
6. ✅ `dialer-app/server/docs/NEXTGEN_PREMIUM_LISTING.md` - Updated docs
7. ✅ `dialer-app/server/docs/NEXTGEN_WEBHOOK_MAPPING.md` - Updated docs

## Status: COMPLETE & READY FOR DEPLOYMENT 🎉

All objectives achieved:
- CSV imports and webhooks now use identical deduplication logic
- Premium listings properly merge regardless of ingestion method
- Comprehensive test coverage ensures reliability
- Clear documentation for maintenance

**Next Step**: Deploy to staging and monitor webhook behavior with real NextGen data. 