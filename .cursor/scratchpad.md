# Legacy Leads – sourceCode Back-fill Plan (2025-07-18)

Objective: Existing leads imported before the new field have blank `sourceCode` labels. Determine why and populate where possible.

---
## Phase 1 – Data Audit (staging)
1. Query a sample of 5 leads missing `sourceCode`:
   ```js
   Lead.find({ $or: [ { sourceCode: null }, { sourceCode: '' }, { sourceCode: { $exists: false } } ] })
       .limit(5)
       .project({ vendorData: 1, notesMetadata: 1, vendorLeadId: 1 })
   ```
2. Inspect which alternate fields hold a usable hash:
   • `vendorData.data_source_hash`
   • `vendorData.source_hash`
   • `notesMetadata.source_hash`
   • fallback: derive from `vendorLeadId` suffix.
3. Aggregate counts per candidate key to estimate back-fill coverage.

## Phase 2 – Script Adjustment
1. Update migration `20250718-backfill-sourceCode.ts` logic:
   ```ts
   const source = lead.vendorData?.data_source_hash
             || lead.vendorData?.source_hash
             || lead.notesMetadata?.source_hash
             || (lead.vendorLeadId ? lead.vendorLeadId.slice(-5) : null);
   if (source) update.$set.sourceCode = source;
   ```
2. Recompile & deploy to staging.
3. Re-run `npm run migrate:sourceCode` via Heroku run.

## Phase 3 – Verification
1. Re-query counts: `% leads with sourceCode` should rise.
2. UI smoke: Leads page shows grey label under Created date for legacy rows.

## Phase 4 – Production Roll-out
1. Push script updates to production.
2. Execute migration on prod (`heroku run --app crokodial npm …`).

---
### Procedural Notes
• Migration is idempotent – runs safely multiple times.
• If some leads still lack data after Phase 3, accept that underlying source hash never existed.
• Add tooltip “not provided” in UI for blank labels (optional future tidy-up). 

### Linter Note
- The previous TypeScript linter error (`.project` not on Query) was removed by switching to `.select()`.  `npm run build` now passes – no blocking errors remain.
- Full lint clean-up is tracked in Post-Feature Clean-up; not a blocker for the migration tweak.

Next actionable: extend migration to read `notesMetadata.originalData.data_source_hash` and `source_hash`, then rerun. 

---
## Arrow Indicator for Currently Dialed Lead (2025-07-18)

Objective: Show a small arrow icon to the left of the lead card that is actively being dialed, without disrupting pull-to-refresh, hover animations, or other UI behaviour.

### Phase A – UI Update
1. Locate card component hierarchy
   • `Leads.tsx` → `renderCardContent()` renders each card inside a `<Flex>` wrapper.
   • No dedicated `LeadCard.tsx`; we will wrap existing card content in a new flex row.
2. Arrow icon
   • Use lightweight inline SVG (chevron-right) sized 12×12 px, colour `#4A5568` (gray-600).
   • Place in a left column (`min-width:16px; display:flex; align-items:center;`).
3. Conditional render
   • Card receives `isActiveDial` boolean prop; arrow shown only when true.

### Phase B – State Management
1. Add `currentDialLeadId` to React context `CallCountsContext` (already used for dial status) or local state in `Leads.tsx`.
2. When user taps “Dial” button → set `currentDialLeadId` to that lead’s `_id`.
3. Pass prop down when mapping leads:
   ```tsx
   leads.map(l => renderCardContent(l, l._id === currentDialLeadId))
   ```

### Phase C – Preserve Existing UX
1. Arrow column width fixed – pull-to-refresh gesture targets card body, not arrow.
2. Hover styles unchanged (arrow sits outside card’s hoverable area but within the same flex row).
3. Mobile: ensure arrow column doesn’t push content; use `flex-shrink:0`.

### Phase D – Testing
1. Unit: shallow render card with `isActiveDial` true/false.
2. E2E (Playwright/Jest): click Dial ▶︎ arrow appears, click Hang-Up ▶︎ arrow disappears.
3. Manual: check pull-to-refresh still works on touchpad/mobile.

### Deliverables
• `Leads.tsx` refactor: add arrow column + state.
• Optional small SVG file `ArrowRightIcon.tsx` in `components/icons`.
• CSS (inline Chakra props / local style) for sizing & animation (`opacity 0→1 0.2s`).
• Tests in `client/src/__tests__/LeadCard.test.tsx`.

No linter / TS errors: run `npm run build` client & server before commit. 