# Lead-Ingestion Discovery Plan

## Objective
Catalogue every path that inserts a lead, explain flow, benefit, and filter/sort integration.

---
## Phase A – Locate Server Entry Points *(WHAT creates a Lead?)*
1. Scan routes for POST /api/leads, /csv-upload, /webhooks, etc.
2. Grep controllers/services for `LeadModel.create`, `insertMany`, `new LeadModel`.
3. Read each hit to confirm validation, side-effects (audit log, WS notify).

## Phase B – Map Triggers *(WHO calls those routes?)*
1. Client UI
   • Manual Add Lead modal/component.
   • CSV Upload page → `/api/csv-upload`.
2. External
   • Webhooks (NextGen, Ringy, etc.).
   • Cron/scripts (scheduled CSV imports).

## Phase C – Understand List Retrieval & Filters
1. Frontend: `Leads.tsx`, `useLeadsQuery`, `LeadsTable` for query params.
2. Backend: `leads.routes.ts`, `leads.controller.ts` for sort/filter parsing.

## Phase D – Correlate Method → Filter/Sort Impact
For each ingestion path document:
• Default fields set (createdAt, vendor, status, etc.)
• Real-time update mechanism (WS broadcast / cache invalidation)
• Any special filter requirements.

## Phase E – Deliverables
1. Summary table (Method | Flow | Benefit | Filter/Sort impact).
2. Sequence diagram(s) for complex flows (e.g., webhook import).
3. Observations & recommendations.

---
### Execution Notes
Run phases A→D with parallel searches & targeted file reads; capture findings here, then craft final output for the user. 

---
## UI & Backend Field Integration Plan (created_at • source_code • price)

### 1. Locate Components / Files
- [ ] `dialer-app/client/src/pages/Leads.tsx` – top-level page rendering list.
- [ ] `dialer-app/client/src/components/LeadsTable.tsx` (or similar) – table wrapper.
- [ ] `dialer-app/client/src/components/LeadRow.tsx` – per-row layout containing Hang-Up button.
- [ ] `dialer-app/client/src/hooks/useLeadsQuery.ts` – data fetch.
- [ ] Backend: `dialer-app/server/src/controllers/leads.controller.ts` & list query helpers.

### 2. Schema & API changes
- [ ] Extend `Lead` Mongoose schema (`models/Lead.ts`): add `price` (Number, default 0), `sourceCode` (String), ensure `createdAt` already exists via timestamps.
- [ ] Update `upsertLead` helper to accept `price` & `sourceCode`.
- [ ] Update lead creation paths (webhook, CSV upload, manual add) to set new fields.
- [ ] Ensure list query default projection includes `createdAt` & `sourceCode` but not heavy fields.

### 3. CSV Dedup Enhancement
- [ ] In `csvParser` (or csvUpload route) detect duplicate `lead_id` rows (product ad + data) → aggregate price.
- [ ] Store single lead with summed `price`.

### 4. Front-End Display
- [ ] Add `created_at` column/element – black text, positioned right of Hang-Up button (update `LeadRow.tsx` flex grid).
- [ ] Add tiny `source_code` label – e.g. `<Text fontSize="xs" color="gray.500">SRC-123</Text>` under/near name.
- [ ] Hide `price` – keep in type definition but do not render.

### 5. Sorting & Filtering
- [ ] Backend list controller: allow `sort=createdAt` and `sort=sourceCode` + indexing.
- [ ] Front-end: extend sort dropdown & filters.
- [ ] Verify query param plumbing (`useLeadsQuery`).

### 6. Tests / Validation
- [ ] Unit test CSV dedup price aggregation.
- [ ] API test: POST lead with price/sourceCode -> retrieve list includes fields.
- [ ] UI smoke: created_at appears, price hidden.

### 7. Rollout Steps
1. Implement schema + migration.
2. Update ingestion paths.
3. Deploy backend, confirm API output.
4. Implement UI tweaks, build client.
5. End-to-end manual test with sample CSV.

--- 
---
## Refinements / Enhancements (per review)

### Migration Strategy
- [ ] Write one-off migration script (server/src/migrations/20250718-add-price-sourceCode.ts) that:
  • Adds `price: 0` and `sourceCode: null` to all existing leads.
  • Creates indexes on `{ createdAt: -1 }` and `{ sourceCode: 1 }` if not present.

### CSV Dedup Algorithm Detail
- [ ] Implement `deduplicateNextGenRows(rows)` in csvParser util:
```ts
interface RawCsvRow { lead_id: string; price: string; product: 'ad' | 'data'; [k:string]: any }
const deduplicateNextGenRows = (rows: RawCsvRow[]) => {
  const map = new Map<string, RawCsvRow & { price: number }>();
  for (const r of rows) {
    const key = r.lead_id;
    const priceNum = parseFloat(r.price || '0');
    if (map.has(key)) {
      map.get(key)!.price += priceNum; // sum ad + data
    } else {
      map.set(key, { ...r, price: priceNum });
    }
  }
  return Array.from(map.values());
};
```
- [ ] Integrate into `parseVendorCSV` flow before upsert.

### Real-time Updates
- [ ] Ensure `upsertLead` caller broadcasts WS `NEW_LEAD` when `isNew=true` (already done for CSV, replicate for webhook/manual).

### Performance / QA
- [ ] Add k6 script (`scripts/perf/leads-sorting.js`) hitting `/api/leads?sort=createdAt` & `sort=sourceCode` for 10k dataset.
- [ ] Add Jest e2e test to confirm sort order.

### 8. Post-Feature Clean-up
- [ ] Address TypeScript/ESLint warnings in `csvUpload.routes.ts` (add explicit parameter types, ensure @types packages present).

--- 

## Task: Investigate DOB not mapping from NextGen webhook

### Understanding Steps
1. Locate webhook entry: `src/routes/webhook.routes.ts` -> NextGen POST handler.
2. Trace to service (`nextgenService.ts`) or controller that builds `minimal` lead payload.
3. Verify payload includes DOB field (`dob`, `date_of_birth`, etc.).
4. Ensure `Lead.upsertLead` receives `dob` and not filtered out.
5. Confirm `Lead` schema has `dob` (string) and is saved.
6. Check CSV parser vs webhook differences – maybe DOB key name differs.

### Possible Root Causes
- Webhook JSON uses `date_of_birth` but field map doesn’t translate.
- DOB arrives but is overridden/cleared later.
- DOB stored but UI format function rejects invalid format.

### Action Plan
- [ ] Read webhook route & service to capture incoming keys.
- [ ] Add / update field mapping to convert `date_of_birth` → `dob` before upsert.
- [ ] Add unit test feeding sample webhook JSON to ensure lead saved with dob.
- [ ] Verify UI `formatDate` handles yyyy-mm-dd vs mm/dd/yyyy.

### Deliverable
Fix applied + test case + manual confirmation in Leads UI. 