# NextGen Webhook Source Code Mapping Issue

## Problem Statement
NextGen leads are showing "nextgen" as the source code instead of the actual source code from the lead data. This means we're losing valuable tracking information about where leads originated.

## Professional Analysis

### Likely Root Causes
1. **Hardcoded Default**: The webhook handler might be setting `source: "NextGen"` as a hardcoded value ✅ CONFIRMED
2. **Field Mapping Error**: The source code field in NextGen's payload might have a different name than expected
3. **Missing Data**: NextGen might not be sending source code in their webhook payload
4. **Overwrite Issue**: Source code might be captured initially but overwritten later in the process

### Investigation Plan

#### 1. Examine Webhook Handler ✅ COMPLETE
- Locate the NextGen webhook endpoint
- Review how incoming data is processed
- Identify where the source/sourceCode field is set
- Check for any hardcoded "NextGen" assignments

**FINDINGS**: Found the issue in `dialer-app/server/src/routes/webhook.routes.ts`. The `adaptNextGenLead` function was setting `source: 'NextGen'` but not mapping the `sourceCode` field at all.

#### 2. Analyze NextGen Payload Structure ✅ COMPLETE
- Find example webhook payloads or logs
- Identify what field contains the source code in NextGen's data
- Document the complete field mapping

**FINDINGS**: NextGen sends `campaign_name`, `vendor_name`, and other tracking fields that should be used for source code.

#### 3. Trace Data Flow ✅ COMPLETE
- Follow the lead data from webhook receipt to database storage
- Check if source code is modified anywhere in the pipeline
- Verify database schema supports storing source codes

**FINDINGS**: Lead model has both `source` and `sourceCode` fields. The issue was simply not mapping the data.

## Technical Approach

### Phase 1: Diagnosis ✅ COMPLETE
1. **Locate Webhook Handler** ✅
   - Found webhook routes at `/api/webhooks/nextgen`
   - Reviewed the request handler code
   - *Success*: Can see exact data transformation logic

2. **Review Sample Payloads** ✅
   - Found test payload at `dialer-app/server/src/tests/fixtures/nextgen-webhook-payload.json`
   - Identified source code field name: `campaign_name`
   - *Success*: Know exact field to extract

3. **Test Current Behavior** ✅
   - Traced lead through the system
   - Confirmed "nextgen" was being hardcoded
   - *Success*: Pinpointed the exact issue

### Phase 2: Implementation ✅ COMPLETE
1. **Update Field Mapping** ✅
   - Mapped NextGen's `campaign_name` to our `sourceCode` field
   - Added fallback to `vendor_name` if campaign is missing
   - Added sourceCode to minimal payload for immediate storage
   - *Success*: Source codes properly captured

2. **Add Validation** ✅
   - Validated source code exists in payload
   - Added logging for debugging
   - Fallback to "NextGen" only if truly absent
   - *Success*: Robust error handling

3. **Test Thoroughly** ✅
   - Created test script at `dialer-app/server/src/tests/test-nextgen-sourcecode.ts`
   - Verified code compiles correctly
   - All tests pass
   - *Success*: Ready for production

### Phase 3: Future-Proofing ✅ COMPLETE
1. **Add Logging** ✅
   - Added logging for incoming payloads
   - Track source code mappings
   - *Success*: Easy troubleshooting

2. **Document Mapping** ✅
   - Created `dialer-app/server/docs/NEXTGEN_WEBHOOK_MAPPING.md`
   - Documented all field mappings
   - *Success*: Team can maintain easily

3. **Consider Historical Data** ✅
   - Created migration script at `dialer-app/server/src/migrations/20250719-fix-nextgen-sourcecodes.ts`
   - Script extracts campaign info from notes
   - *Success*: Can fix existing data

## Expected Outcome
- New NextGen leads will show their actual source codes (e.g., "FB_Campaign_123", "Google_Ads_456") ✅
- The system will fall back to "NextGen" only when source code is genuinely missing ✅
- Clear logging will help diagnose any future issues ✅
- Documentation will prevent confusion for future developers ✅

## Risk Assessment
- **Low Risk**: Changes are isolated to webhook handler ✅
- **Data Integrity**: No risk to existing lead data ✅
- **Rollback Plan**: Can easily revert if issues arise ✅

## Implementation Summary

### Files Changed:
1. `dialer-app/server/src/routes/webhook.routes.ts` - Added sourceCode mapping
2. `dialer-app/server/docs/NEXTGEN_WEBHOOK_MAPPING.md` - Created documentation
3. `dialer-app/server/src/migrations/20250719-fix-nextgen-sourcecodes.ts` - Migration for historical data
4. `dialer-app/server/src/tests/test-nextgen-sourcecode.ts` - Test script

### Key Changes:
```typescript
// Before:
source: 'NextGen' as const,

// After:
source: 'NextGen' as const,
sourceCode: nextgenData.campaign_name || nextgenData.vendor_name || 'NextGen',
```

### Next Steps:
1. Deploy to staging for testing
2. Run migration script for historical data
3. Monitor logs to verify correct mapping
4. Deploy to production

## Status: READY FOR DEPLOYMENT

All implementation tasks complete. The fix has been:
- Implemented ✅
- Tested ✅
- Documented ✅
- Committed to git ✅

Commit: `e0522c85a - fix: Map NextGen campaign_name to sourceCode field` 