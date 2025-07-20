# 🚀 Crokodial CRM Quick Reference (ENHANCED)

## 🚨 CRITICAL VIOLATIONS (Fix Immediately)

### Component Size Violations
- ❌ **Leads.tsx**: 6,879 lines (MUST break down to <500 lines each)
- ❌ **Dialer.tsx**: 3,506 lines (MUST refactor immediately)

### Security Vulnerabilities
- ❌ **JWT in localStorage** → MUST move to httpOnly cookies
- ❌ **API keys in code** → MUST use environment variables
- ❌ **No rate limiting** → MUST implement on auth/import endpoints

### Performance Issues
- ❌ **Client-side filtering** → MUST implement server-side pagination
- ❌ **No React.memo** → MUST optimize expensive renders
- ❌ **Memory leaks** → MUST audit useEffect cleanup

### Current Production Blockers
- ❌ **Search broken** → Client-side search fails at 500+ leads (line ~6083 Leads.tsx)
- ❌ **WebSocket auth failing** → JWT signature mismatch causing connection errors
- ❌ **Loading timeouts** → AuthContext can hang indefinitely

---

## 🔥 NEW: 5 CRITICAL ENHANCEMENTS

### 1. Integration-Specific Patterns (BUSINESS CRITICAL)
```typescript
// MANDATORY: Twilio call tracking with error handling
const makeCall = async (phone: string, userId: string) => {
  try {
    const call = await twilio.calls.create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.BASE_URL}/api/twilio/status`
    });
    await Call.create({ twilioSid: call.sid, userId, phoneNumber: phone });
  } catch (error) {
    logger.error('Twilio call failed', { phone, userId, error });
    throw new Error(`Call failed: ${error.message}`);
  }
};

// MANDATORY: NextGen webhook deduplication
const processNextGenWebhook = async (payload) => {
  const existing = await Lead.findOne({ email: payload.email, phone: payload.phone });
  if (existing) return { status: 'duplicate', leadId: existing._id };
  // Process new lead...
};
```

### 2. Current Issue Resolution Patterns (IMMEDIATELY APPLICABLE)
```typescript
// ❌ BROKEN: Current search (Leads.tsx line ~6083)
useEffect(() => {
  fetchLeads({ getAllResults: 'true', limit: 1000 }).then(allLeads => {
    const filtered = allLeads.filter(lead => lead.name.startsWith(searchQuery));
  });
}, [searchQuery]);

// ✅ FIXED: Server-side search
useEffect(() => {
  if (searchQuery.trim()) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      fetchLeads({ 
        search: searchQuery.trim(), // Server searches ALL leads
        page: currentPage,
        limit: 50 
      }, { signal: abortController.signal })
      .then(response => setLeads(response.data.leads));
    }, 300);
    return () => { clearTimeout(timeout); abortController.abort(); };
  }
}, [searchQuery, currentPage]);
```

### 3. Deployment & Build Reliability (HEROKU CRITICAL)
```bash
# MANDATORY: Pre-deployment checklist
pre_deploy_checklist() {
  npm run lockfile:linux || exit 1  # CRITICAL for Heroku
  npm audit --audit-level=high || exit 1
  npx tsc --noEmit || exit 1
  npm test -- --coverage --passWithNoTests || exit 1
  npm run build || exit 1
}

# MANDATORY: Post-deployment verification
curl -s https://crokodial.com/api/health | jq '.'
curl -s https://crokodial.com/api/leads?limit=1 | jq '.data[0]'
```

### 4. Component Refactoring Strategy (TECHNICAL DEBT RESOLUTION)
```typescript
// IMMEDIATE PRIORITY: Break down Leads.tsx (6879 lines → <500 each)
// 1. LeadListContainer.tsx (<300 lines)
// 2. LeadCard.tsx (<200 lines) 
// 3. LeadFilters.tsx (<250 lines)
// 4. Custom hooks: useLeadsData, useLeadActions, useLeadFilters

// IMMEDIATE PRIORITY: Break down Dialer.tsx (3506 lines → <500 each)
// 1. DialerContainer.tsx (<300 lines)
// 2. CallControls.tsx (<200 lines)
// 3. CallHistory.tsx (<200 lines)
// 4. DetachedDialerWindow.tsx (<300 lines)
```

### 5. Error Handling & Recovery Patterns (PRODUCTION STABILITY)
```typescript
// MANDATORY: Error boundaries for all major sections
class CRMErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error('CRM Error Boundary caught error', { error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback resetError={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// MANDATORY: Loading timeout prevention
const useTimeoutLoading = (loading: boolean, timeoutMs: number = 10000) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) { setTimedOut(false); return; }
    const timeout = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timeout);
  }, [loading, timeoutMs]);
  return { loading: loading && !timedOut, timedOut };
};
```

---

## 🔄 CSV Import Standards

### Format Detection (ALWAYS CHECK FIRST)
```typescript
const isNextGen = headers.includes('source_hash') && headers.includes('data_source_hash');
const isMarketplace = headers.includes('leadID') && headers.includes('trustedFormCertID');
```

### NextGen Format
- **Pattern**: `purchases-YYYY-MM-DD-to-YYYY-MM-DD.csv`
- **Columns**: 42 columns, exact order required
- **Key Fields**: `source_hash`, `data_source_hash`, `sub_id_hash` (ONLY NextGen)
- **Dates**: ISO 8601 format
- **Source Code**: `sourceCode` = `source_hash` field

### Marketplace Format  
- **Pattern**: `lead-report-*.csv`
- **Columns**: 22 columns, exact order required
- **Key Fields**: `leadID`, `trustedFormCertID` (NO hash columns)
- **Dates**: `MM-DD-YYYY HH:MM:SS` (requires conversion)
- **Source Code**: Derived from `campaignName` or defaults to "Marketplace"

### Critical Rules
- ❌ **NEVER** mix CSV formats in single import
- ✅ **ALWAYS** validate header before parsing rows
- ✅ **ALWAYS** convert dates to ISO 8601 internally
- ✅ **NEVER** modify column order without updating all mappers
- ✅ **TEST** both formats when changing import logic

---

## 💎 NextGen Premium Listing Logic

### The Dual-File Problem
NextGen sends **2 files per purchase**:
- **Main Lead** (`product: "data"`) - Full data + base price
- **Premium Listing** (`product: "ad"`) - Minimal data + $5 upsell

### Critical Rules
- ❌ **NEVER** create 2 separate leads for same `lead_id`
- ✅ **ALWAYS** merge premium price into main lead: `base + $5`
- ✅ **DISCARD** the premium listing record after merging
- ✅ **HANDLE** both processing orders (main→premium, premium→main)

### Quick Implementation Check
```typescript
const isMainLead = record.product === 'data';
const isPremiumListing = record.product === 'ad' && record.price === 5;

if (existingLead && isPremiumListing) {
  // MERGE: Add $5 to existing lead, discard premium record
  totalPrice = existingLead.price + 5;
}
```

### Expected Result
- **1 lead** per purchase (not 2)
- **Combined price** (e.g., $45 + $5 = $50)
- **Notes** showing premium application

---

## ✅ MANDATORY STANDARDS

### Code Quality
- **Component Size**: <500 lines maximum
- **Test Coverage**: 80% minimum for new code
- **TypeScript**: Strict mode, no `any` types
- **Multi-Tenant**: Every query includes userId scope
- **Error Handling**: Comprehensive try/catch blocks

### Performance Targets
- **Lead List**: <200ms for 100 leads, <500ms for 1000 leads
- **Search Response**: <300ms server-side search
- **Call Initiation**: <100ms click to Twilio API
- **Page Load**: <2s initial, <500ms navigation

### Security Requirements
- **JWT Storage**: httpOnly cookies with CSRF protection
- **API Keys**: Environment variables only
- **Rate Limiting**: Auth and import endpoints
- **Input Validation**: Zod schemas for all endpoints
- **Audit Logging**: Track all lead access/modifications

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment (MANDATORY)
- [ ] `npm run lockfile:linux` (CRITICAL for Heroku)
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] `npm test` passes with 80%+ coverage
- [ ] `npx tsc --noEmit` successful
- [ ] Component size check (<500 lines)
- [ ] Multi-tenant security tests pass

### Post-Deployment Verification
```bash
curl -s https://crokodial.com/api/health | jq '.'
curl -s https://crokodial.com/api/leads?limit=1 | jq '.data.pagination.total'
curl -s https://crokodial.com/index.html | grep -o "assets/index-[a-f0-9]*\.js"
```

---

## 🔧 QUICK FIXES

### Fix Search Issue (PRODUCTION BLOCKER)
1. Open `dialer-app/client/src/pages/Leads.tsx`
2. Find line ~6083: `getAllResults: 'true',`
3. Replace entire useEffect with server-side search pattern above
4. Test with "anthony" search - should find ALL leads, not just first 500

### Fix WebSocket Auth
1. Ensure consistent `JWT_SECRET` across all environments
2. Update token generation to use consistent payload structure
3. Add proper error handling for WebSocket authentication failures

### Fix Loading Timeouts
1. Add timeout handling to all loading states (max 10-15 seconds)
2. Implement fallback UI for timeout scenarios
3. Add cleanup functions to prevent memory leaks

---

## 🎯 IMMEDIATE NEXT ACTIONS

### This Session Priority
1. **Fix Search** - Replace client-side with server-side (line ~6083 Leads.tsx)
2. **Component Refactor** - Start breaking down Leads.tsx into smaller components
3. **Security Hardening** - Move JWT to httpOnly cookies
4. **Testing Setup** - Implement Jest + Cypress with 80% coverage target
5. **Performance** - Add React.memo and virtual scrolling for large lists

### Success Criteria
- [ ] Search works for ALL 2,182+ leads (not limited to 500)
- [ ] No components >500 lines
- [ ] 80% test coverage for new code
- [ ] JWT stored in httpOnly cookies
- [ ] All integrations (Twilio, NextGen, Calendly) working
- [ ] Production deployment successful with evidence verification

*This enhanced quick reference provides immediate context for the 5 critical improvements that make the rules 100% bulletproof for professional CRM development.* 