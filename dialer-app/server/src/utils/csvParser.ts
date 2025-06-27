/**
 * CSV Parser with Vendor Detection
 * Production-grade CSV parsing with automatic vendor detection and field mapping
 */

import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { fixDob } from './fixDob';

// Vendor fingerprint headers - these are unique to each vendor
const VENDOR_FINGERPRINTS = {
  NEXTGEN: ['purchase_id', 'vertical_id', 'vendor_id'],
  MARKETPLACE: ['leadID', 'utm_source', 'primaryPhone'],
} as const;

// Field mapping tables for each vendor
const NEXTGEN_FIELD_MAP: Record<string, string> = {
  // Lead identification
  lead_id: 'leadId',
  purchase_id: 'purchaseId',

  // Name fields
  first_name: 'firstName',
  last_name: 'lastName',

  // Contact fields
  phone: 'phone',
  email: 'email',

  // Address fields
  street_1: 'street1',
  street_2: 'street2',
  city: 'city',
  state: 'state',
  zipcode: 'zipcode',
  zip: 'zipcode', // Alternative

  // Demographics
  dob: 'dob',
  date_of_birth: 'dob', // Alternative
  gender: 'gender',
  height: 'height',
  weight: 'weight',

  // Insurance fields
  household_size: 'householdSize',
  household_income: 'householdIncome',
  military: 'military',
  pregnant: 'pregnant',
  tobacco_user: 'tobaccoUser',
  has_prescription: 'hasPrescription',
  has_medicare_parts_a_b: 'hasMedicarePartsAB',
  has_medical_condition: 'hasMedicalCondition',
  medical_conditions: 'medicalConditions',
  insurance_timeframe: 'insuranceTimeframe',

  // Campaign data
  campaign_name: 'campaignName',
  product: 'product',
  vendor_name: 'vendorName',
  account_name: 'accountName',
  bid_type: 'bidType',
  price: 'price',

  // Call tracking
  call_log_id: 'callLogId',
  call_duration: 'callDuration',
  source_hash: 'sourceHash',
  sub_id_hash: 'subIdHash',

  // Status fields
  status: 'status',
  disposition: 'disposition',
  created_at: 'createdAt',
};

const MARKETPLACE_FIELD_MAP: Record<string, string> = {
  // Lead identification
  leadID: 'leadId',

  // Name fields
  firstName: 'firstName',
  lastName: 'lastName',

  // Contact fields
  primaryPhone: 'phone',
  email: 'email',

  // Address fields
  address1: 'street1',
  address2: 'street2',
  city: 'city',
  stateCode: 'state',
  state: 'state',
  State: 'state',
  postalCode: 'zipcode',

  // Demographics
  dateOfBirth: 'dob',
  gender: 'gender',
  height: 'height',
  weight: 'weight',

  // Insurance fields
  householdSize: 'householdSize',
  householdIncome: 'householdIncome',
  isMilitary: 'military',
  isPregnant: 'pregnant',
  tobaccoUse: 'tobaccoUser',
  hasPrescriptions: 'hasPrescription',
  hasMedicare: 'hasMedicarePartsAB',
  hasMedicalCondition: 'hasMedicalCondition',
  medicalConditions: 'medicalConditions',
  insuranceNeeded: 'insuranceTimeframe',

  // Campaign data
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',

  // Status fields
  status: 'status',
  disposition: 'disposition',
  created: 'createdAt',
};

// Canonical lead interface
export interface CanonicalLead {
  // Core fields
  leadId?: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Will be computed from firstName + lastName
  phone?: string;
  email?: string;

  // Address
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipcode?: string;

  // Demographics
  dob?: string;
  gender?: string;
  height?: string;
  weight?: string;

  // Insurance
  householdSize?: string;
  householdIncome?: string;
  military?: boolean;
  pregnant?: boolean;
  tobaccoUser?: boolean;
  hasPrescription?: boolean;
  hasMedicarePartsAB?: boolean;
  hasMedicalCondition?: boolean;
  medicalConditions?: string[];
  insuranceTimeframe?: string;

  // Source tracking
  source: 'NextGen' | 'Marketplace' | 'Self Generated' | 'CSV Import';
  importedAt: Date;
  notesMetadata: Record<string, any>;

  // Additional vendor-specific fields
  vendorData?: Record<string, any>;
}

export type VendorType = 'NEXTGEN' | 'MARKETPLACE' | 'UNKNOWN';

export interface ParseResult {
  vendor: VendorType;
  leads: CanonicalLead[];
  warnings: string[];
  errors: string[];
  stats: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    unknownColumns: string[];
  };
}

/**
 * Detect vendor based on CSV headers
 */
function detectVendor(headers: string[]): VendorType {
  const normalizedHeaders = headers.map((h) => h.trim());

  // Check NextGen fingerprints
  const hasNextGenFingerprints = VENDOR_FINGERPRINTS.NEXTGEN.some((fingerprint) =>
    normalizedHeaders.includes(fingerprint)
  );

  if (hasNextGenFingerprints) {
    return 'NEXTGEN';
  }

  // Check Marketplace fingerprints
  const hasMarketplaceFingerprints = VENDOR_FINGERPRINTS.MARKETPLACE.some((fingerprint) =>
    normalizedHeaders.includes(fingerprint)
  );

  if (hasMarketplaceFingerprints) {
    return 'MARKETPLACE';
  }

  return 'UNKNOWN';
}

/**
 * Get field mapping based on vendor
 */
function getFieldMapping(vendor: VendorType): Record<string, string> {
  switch (vendor) {
    case 'NEXTGEN':
      return NEXTGEN_FIELD_MAP;
    case 'MARKETPLACE':
      return MARKETPLACE_FIELD_MAP;
    default:
      return {};
  }
}

/**
 * Convert vendor-specific row to canonical lead format
 */
function mapRowToCanonicalLead(
  row: Record<string, any>,
  vendor: VendorType,
  fieldMap: Record<string, string>
): CanonicalLead {
  const canonical: CanonicalLead = {
    source:
      vendor === 'NEXTGEN' ? 'NextGen' : vendor === 'MARKETPLACE' ? 'Marketplace' : 'CSV Import',
    importedAt: new Date(),
    notesMetadata: {},
    vendorData: {},
  };

  // Map known fields
  for (const [csvField, canonicalField] of Object.entries(fieldMap)) {
    if (row[csvField] !== undefined && row[csvField] !== '') {
      // Handle boolean conversions
      if (
        [
          'military',
          'pregnant',
          'tobaccoUser',
          'hasPrescription',
          'hasMedicarePartsAB',
          'hasMedicalCondition',
        ].includes(canonicalField)
      ) {
        (canonical as any)[canonicalField] = ['true', 'yes', '1', 't', 'y'].includes(
          String(row[csvField]).toLowerCase()
        );
      }
      // Handle array fields
      else if (canonicalField === 'medicalConditions' && row[csvField]) {
        canonical.medicalConditions = String(row[csvField])
          .split(',')
          .map((s) => s.trim());
      }
      // Regular fields
      else {
        let value = String(row[csvField]).trim();
        // Apply DOB normalisation if this is the dob field
        if (canonicalField === 'dob') {
          const fixed = fixDob(value);
          if (fixed) value = fixed;
        }
        (canonical as any)[canonicalField] = value;
      }
    }
  }

  // Store unmapped fields in vendorData
  for (const [key, value] of Object.entries(row)) {
    if (!fieldMap[key] && value) {
      canonical.vendorData![key] = value;
    }
  }

  // Compute full name if we have parts
  if (canonical.firstName || canonical.lastName) {
    canonical.name = [canonical.firstName, canonical.lastName].filter(Boolean).join(' ').trim();
  }

  // Set notesMetadata
  canonical.notesMetadata = {
    ...canonical.vendorData,
    importedOn: canonical.importedAt.toLocaleDateString(),
    source: canonical.source,
    originalData: row,
  };

  // Normalize phone number
  if (canonical.phone) {
    canonical.phone = canonical.phone.replace(/\D/g, '');
    if (canonical.phone.length === 10) {
      canonical.phone = `(${canonical.phone.slice(0, 3)}) ${canonical.phone.slice(3, 6)}-${canonical.phone.slice(6)}`;
    }
  }

  // Normalize state to uppercase
  if (canonical.state) {
    canonical.state = canonical.state.toUpperCase();
  }

  return canonical;
}

/**
 * Parse CSV with vendor detection
 */
export async function parseVendorCSV(
  csvContent: string | Buffer,
  options: {
    skipEmptyLines?: boolean;
    trimHeaders?: boolean;
    maxRows?: number;
  } = {}
): Promise<ParseResult> {
  const result: ParseResult = {
    vendor: 'UNKNOWN',
    leads: [],
    warnings: [],
    errors: [],
    stats: {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      unknownColumns: [],
    },
  };

  try {
    const records: any[] = await new Promise((resolve, reject) => {
      const output: any[] = [];

      parse(
        csvContent,
        {
          columns: true,
          skip_empty_lines: options.skipEmptyLines ?? true,
          trim: true,
          cast: true,
          cast_date: false, // Handle dates manually
          relax_quotes: true,
          relax_column_count: true,
        },
        (err: any, records: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(records);
          }
        }
      );
    });

    if (records.length === 0) {
      result.errors.push('CSV file is empty');
      return result;
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);

    // Detect vendor
    result.vendor = detectVendor(headers);

    if (result.vendor === 'UNKNOWN') {
      result.errors.push(
        'Unable to detect vendor. Expected headers containing either: ' +
          `[${VENDOR_FINGERPRINTS.NEXTGEN.join(', ')}] for NextGen or ` +
          `[${VENDOR_FINGERPRINTS.MARKETPLACE.join(', ')}] for Marketplace. ` +
          `Found headers: [${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}]`
      );
      return result;
    }

    // Get field mapping
    const fieldMap = getFieldMapping(result.vendor);
    const knownFields = new Set(Object.keys(fieldMap));

    // Find unknown columns
    const unknownColumns = headers.filter((h) => !knownFields.has(h));
    if (unknownColumns.length > 0) {
      result.stats.unknownColumns = unknownColumns;
      result.warnings.push(
        `Found ${unknownColumns.length} unmapped columns: ${unknownColumns.slice(0, 5).join(', ')}` +
          `${unknownColumns.length > 5 ? '...' : ''}. These will be stored in vendorData.`
      );
    }

    // Process records
    const maxRows = options.maxRows || Infinity;
    const recordsToProcess = records.slice(0, maxRows);

    for (let i = 0; i < recordsToProcess.length; i++) {
      result.stats.totalRows++;

      try {
        const record = recordsToProcess[i];
        const lead = mapRowToCanonicalLead(record, result.vendor, fieldMap);

        // Validate required fields
        if (!lead.phone && !lead.email) {
          result.warnings.push(`Row ${i + 2}: Skipping - no phone or email`);
          result.stats.failedRows++;
          continue;
        }

        result.leads.push(lead);
        result.stats.successfulRows++;
      } catch (error) {
        result.errors.push(
          `Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.stats.failedRows++;
      }
    }

    if (records.length > maxRows) {
      result.warnings.push(`Processed only first ${maxRows} rows out of ${records.length} total`);
    }
  } catch (error) {
    result.errors.push(
      `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Get vendor display name
 */
export function getVendorDisplayName(vendor: VendorType): string {
  switch (vendor) {
    case 'NEXTGEN':
      return 'NextGen';
    case 'MARKETPLACE':
      return 'Marketplace';
    default:
      return 'Unknown Vendor';
  }
}
