"use strict";
/**
 * NextGen Webhook Field Mapping Test
 *
 * This script tests the adaptNextGenLead function with a sample payload
 * to verify that demographic fields are correctly mapped and formatted.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Import the test payload
const payload = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, './fixtures/nextgen-webhook-payload.json'), 'utf-8'));
// Define the NextGenLeadSchema (copied from webhook.routes.ts)
const NextGenLeadSchema = zod_1.z.object({
    lead_id: zod_1.z.string().optional(),
    nextgen_id: zod_1.z.string().optional(),
    // Contact information
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    // Location
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().length(2).optional(),
    zip_code: zod_1.z.string().optional(),
    street_address: zod_1.z.string().optional(),
    // Demographics
    dob: zod_1.z.string().optional(),
    age: zod_1.z.number().optional(),
    gender: zod_1.z.enum(['M', 'F', 'Male', 'Female']).optional(),
    height: zod_1.z.string().optional(),
    weight: zod_1.z.string().optional(),
    // Health information
    tobacco_user: zod_1.z.boolean().optional(),
    pregnant: zod_1.z.boolean().optional(),
    has_prescription: zod_1.z.boolean().optional(),
    has_medicare_parts_ab: zod_1.z.boolean().optional(),
    has_medical_condition: zod_1.z.boolean().optional(),
    medical_conditions: zod_1.z.array(zod_1.z.string()).optional(),
    // Household
    household_size: zod_1.z.string().optional(),
    household_income: zod_1.z.string().optional(),
    // Campaign data
    campaign_name: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    vendor_name: zod_1.z.string().optional(),
    account_name: zod_1.z.string().optional(),
    bid_type: zod_1.z.string().optional(),
    price: zod_1.z.string().optional(),
    // Call tracking
    call_log_id: zod_1.z.string().optional(),
    call_duration: zod_1.z.string().optional(),
    source_hash: zod_1.z.string().optional(),
    sub_id_hash: zod_1.z.string().optional(),
});
// Adapter to convert NextGen format to our Lead schema (copied from webhook.routes.ts)
const adaptNextGenLead = (nextgenData) => {
    // Format height from inches to feet/inches (if it's a number)
    let formattedHeight = nextgenData.height;
    if (nextgenData.height && !isNaN(parseInt(nextgenData.height))) {
        const heightInches = parseInt(nextgenData.height);
        formattedHeight = `${Math.floor(heightInches / 12)}'${heightInches % 12}"`;
    }
    // Format date of birth
    const formattedDob = nextgenData.dob ? new Date(nextgenData.dob).toLocaleDateString() : undefined;
    // Format gender (capitalize first letter)
    let formattedGender = undefined;
    if (nextgenData.gender) {
        if (nextgenData.gender.toLowerCase().startsWith('m')) {
            formattedGender = 'Male';
        }
        else if (nextgenData.gender.toLowerCase().startsWith('f')) {
            formattedGender = 'Female';
        }
    }
    const adapted = {
        // IDs
        nextgenId: nextgenData.nextgen_id || nextgenData.lead_id,
        // Name
        firstName: nextgenData.first_name,
        lastName: nextgenData.last_name,
        name: [nextgenData.first_name, nextgenData.last_name].filter(Boolean).join(' ') || 'NextGen Lead',
        // Contact
        email: nextgenData.email,
        phone: nextgenData.phone,
        // Location
        city: nextgenData.city?.trim(),
        state: nextgenData.state?.toUpperCase()?.trim(),
        zipcode: nextgenData.zip_code?.trim(),
        street1: nextgenData.street_address?.trim(),
        // Demographics - with consistent formatting
        dob: formattedDob,
        gender: formattedGender,
        height: formattedHeight,
        weight: nextgenData.weight,
        // Health
        tobaccoUser: nextgenData.tobacco_user,
        pregnant: nextgenData.pregnant,
        hasPrescription: nextgenData.has_prescription,
        hasMedicarePartsAB: nextgenData.has_medicare_parts_ab,
        hasMedicalCondition: nextgenData.has_medical_condition,
        medicalConditions: nextgenData.medical_conditions,
        // Household
        householdSize: nextgenData.household_size,
        householdIncome: nextgenData.household_income,
        // Campaign
        campaignName: nextgenData.campaign_name,
        product: nextgenData.product,
        vendorName: nextgenData.vendor_name,
        accountName: nextgenData.account_name,
        bidType: nextgenData.bid_type,
        price: nextgenData.price ? parseFloat(nextgenData.price) : undefined,
        // Call tracking
        callLogId: nextgenData.call_log_id,
        callDuration: nextgenData.call_duration ? parseInt(nextgenData.call_duration) : undefined,
        sourceHash: nextgenData.source_hash,
        subIdHash: nextgenData.sub_id_hash,
        // Defaults
        source: 'NextGen',
        disposition: 'New Lead',
        status: 'New',
    };
    // Remove undefined values
    Object.keys(adapted).forEach((key) => {
        if (adapted[key] === undefined) {
            delete adapted[key];
        }
    });
    return adapted;
};
// Validate and adapt the payload
const validationResult = NextGenLeadSchema.safeParse(payload);
if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.errors);
    process.exit(1);
}
// Adapt the lead data
const leadData = adaptNextGenLead(validationResult.data);
// Print the resulting lead data, focusing on demographic fields
console.log('Original payload demographics:');
console.log({
    dob: payload.dob,
    gender: payload.gender,
    height: payload.height,
    weight: payload.weight,
    zipcode: payload.zip_code,
    state: payload.state,
    city: payload.city
});
console.log('\nAdapted lead demographics:');
console.log({
    dob: leadData.dob,
    gender: leadData.gender,
    height: leadData.height,
    weight: leadData.weight,
    zipcode: leadData.zipcode,
    state: leadData.state,
    city: leadData.city
});
console.log('\nAll adapted lead data:');
console.log(JSON.stringify(leadData, null, 2));
