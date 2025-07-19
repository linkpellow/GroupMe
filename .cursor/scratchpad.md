# NextGen Webhook Source Code Mapping Issue

## Problem Statement
NextGen leads are showing "nextgen" as the source code instead of the actual source code from the lead data. This means we're losing valuable tracking information about where leads originated.

## Professional Analysis

### Likely Root Causes
1. **Hardcoded Default**: The webhook handler might be setting `source: "NextGen"` as a hardcoded value
2. **Field Mapping Error**: The source code field in NextGen's payload might have a different name than expected
3. **Missing Data**: NextGen might not be sending source code in their webhook payload
4. **Overwrite Issue**: Source code might be captured initially but overwritten later in the process

### Investigation Plan

#### 1. Examine Webhook Handler
- Locate the NextGen webhook endpoint
- Review how incoming data is processed
- Identify where the source/sourceCode field is set
- Check for any hardcoded "NextGen" assignments

#### 2. Analyze NextGen Payload Structure
- Find example webhook payloads or logs
- Identify what field contains the source code in NextGen's data
- Document the complete field mapping

#### 3. Trace Data Flow
- Follow the lead data from webhook receipt to database storage
- Check if source code is modified anywhere in the pipeline
- Verify database schema supports storing source codes

## Technical Approach

### Phase 1: Diagnosis
1. **Locate Webhook Handler**
   - Find webhook routes (likely `/webhook/nextgen` or similar)
   - Review the request handler code
   - *Success*: Can see exact data transformation logic

2. **Review Sample Payloads**
   - Check logs or test payloads
   - Identify source code field name
   - *Success*: Know exact field to extract

3. **Test Current Behavior**
   - Trace a test lead through the system
   - Confirm where "nextgen" is being set
   - *Success*: Pinpoint the exact issue

### Phase 2: Implementation
1. **Update Field Mapping**
   - Map NextGen's source code field to our `sourceCode` field
   - Preserve original data instead of overwriting
   - *Success*: Source codes properly captured

2. **Add Validation**
   - Validate source code exists in payload
   - Log warnings if missing
   - Fallback to "NextGen" only if truly absent
   - *Success*: Robust error handling

3. **Test Thoroughly**
   - Test with various NextGen payloads
   - Verify existing leads aren't affected
   - Confirm new leads show correct source codes
   - *Success*: All leads display accurate source codes

### Phase 3: Future-Proofing
1. **Add Logging**
   - Log incoming payloads for debugging
   - Track source code mappings
   - *Success*: Easy troubleshooting

2. **Document Mapping**
   - Create clear documentation of field mappings
   - Note any transformations or validations
   - *Success*: Team can maintain easily

3. **Consider Historical Data**
   - Decide if we need to fix existing leads
   - Plan migration if needed
   - *Success*: Data consistency

## Expected Outcome
- New NextGen leads will show their actual source codes (e.g., "FB_Campaign_123", "Google_Ads_456")
- The system will fall back to "NextGen" only when source code is genuinely missing
- Clear logging will help diagnose any future issues
- Documentation will prevent confusion for future developers

## Risk Assessment
- **Low Risk**: Changes are isolated to webhook handler
- **Data Integrity**: No risk to existing lead data
- **Rollback Plan**: Can easily revert if issues arise 