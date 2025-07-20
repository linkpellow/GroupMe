# 🚀 Crokodial CRM Quick Reference

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

---

## ✅ MANDATORY STANDARDS

### Code Quality
- **Component Size**: <500 lines maximum
- **Test Coverage**: 80% minimum for new code
- **TypeScript**: Strict mode, no `any` types
- **Multi-Tenant**: Every query MUST include userId/tenantId

### Performance Targets
- **Lead List**: <200ms for 100 leads, <500ms for 1000 leads
- **Search**: <300ms server-side search
- **API Response**: <200ms average
- **Memory**: <100MB steady state

### Security Requirements
- **JWT**: httpOnly cookies with CSRF protection
- **Input Validation**: Zod schemas for all endpoints
- **Rate Limiting**: Auth (5/15min), Import (100/hour)
- **Multi-Tenant**: Built into data access layer

---

## 🔧 DEPLOYMENT CHECKLIST

### Pre-Deploy (MANDATORY)
```bash
# 1. Linux lockfile (CRITICAL for Heroku)
npm run lockfile:linux

# 2. Security audit
npm audit

# 3. Test coverage
npm test

# 4. Lint check
npm run lint

# 5. TypeScript check
npx tsc --noEmit
```

### Post-Deploy Verification
```bash
# Health checks
curl -s https://crokodial.com/api/health | jq '.'
curl -s https://crokodial.com/api/leads?limit=1 | jq '.data[0]'
```

---

## 📋 QUICK FIXES

### JWT Security Migration
```typescript
// BEFORE (VULNERABLE):
localStorage.setItem('token', jwt);

// AFTER (SECURE):
res.cookie('auth_token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
});
```

### Multi-Tenant Data Access
```typescript
// ALWAYS include userId in queries
const leads = await Lead.find({ userId }).lean();

// NEVER do global queries without user scoping
const leads = await Lead.find({}); // ❌ SECURITY VIOLATION
```

### Server-Side Pagination
```typescript
// Replace client-side filtering with server pagination
const getLeads = async (userId: string, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  return Lead.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};
```

---

## 🎯 REFACTORING PRIORITIES

### 1. Break Down Leads.tsx (6,879 lines)
```typescript
// Extract to separate components:
- LeadCard (< 200 lines)
- LeadFilters (< 200 lines)  
- LeadList (< 200 lines)
- LeadActions (< 200 lines)
- LeadPagination (< 200 lines)
```

### 2. Break Down Dialer.tsx (3,506 lines)
```typescript
// Extract to separate components:
- CallControls (< 200 lines)
- CallHistory (< 200 lines)
- CallStatus (< 200 lines)
- DialerWindow (< 200 lines)
```

### 3. Feature-Based Organization
```
src/features/
  ├── leads/     # All lead-related code
  ├── dialer/    # All dialer-related code
  ├── auth/      # Authentication code
  └── integrations/ # 3rd-party services
```

---

## 🔍 TESTING STRATEGY

### Component Tests (80% Coverage)
```typescript
describe('LeadCard', () => {
  it('displays lead info correctly', () => {
    const lead = createMockLead({ userId: 'user123' });
    render(<LeadCard lead={lead} />);
    expect(screen.getByText(lead.name)).toBeInTheDocument();
  });

  it('prevents cross-tenant access', () => {
    const userALead = createMockLead({ userId: 'userA' });
    render(<LeadCard lead={userALead} />, { user: { id: 'userB' } });
    expect(screen.queryByText(userALead.name)).not.toBeInTheDocument();
  });
});
```

### API Tests (Multi-Tenant)
```typescript
describe('Leads API', () => {
  it('returns only user-scoped leads', async () => {
    const response = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(response.body.data.every(lead => lead.userId === userId)).toBe(true);
  });
});
```

---

## 🚨 NEVER DO THIS

- ❌ Create components >500 lines
- ❌ Store JWT in localStorage  
- ❌ Skip multi-tenant scoping in queries
- ❌ Use client-side filtering >100 records
- ❌ Deploy without `npm run lockfile:linux`
- ❌ Hardcode API keys in code
- ❌ Skip error boundaries
- ❌ Ignore test coverage requirements

---

*Keep this reference handy for professional CRM development standards!* 