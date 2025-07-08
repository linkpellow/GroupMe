# Crokodial API Endpoints
Generated on: Mon Apr 28 17:35:54 EDT 2025


## CSV Import (Multi-Tenant)

### POST /api/csv-upload
Authenticated CSV lead importer that automatically assigns the current user’s tenant.

Request:
• Headers: `Authorization: Bearer <JWT>`
• Body: `multipart/form-data` field `file` (CSV file ≤ 50 MB)

Behaviour:
1. Parses vendor-specific formats using `parseVendorCSV`.
2. For each row it calls `LeadModel.upsertLead` with:
   – `tenantId = req.user._id`
   – `assignedTo = req.user._id`
3. Returns JSON `{ success, vendor, stats: { imported, updated, processed } }`.
4. Broadcasts `new_lead_notification` WebSocket events for newly inserted leads.

### Deprecated Endpoint
`POST /api/leads/import-csv` is now **deprecated**.  Non-admin callers receive HTTP 410 with guidance to use `/api/csv-upload`; admins may still use it temporarily.

