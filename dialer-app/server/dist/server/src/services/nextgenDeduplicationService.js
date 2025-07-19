"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPremiumListing = isPremiumListing;
exports.isMainDataRecord = isMainDataRecord;
exports.getDeduplicationKey = getDeduplicationKey;
exports.formatPremiumListingNote = formatPremiumListingNote;
exports.processNextGenLead = processNextGenLead;
exports.processNextGenBatch = processNextGenBatch;
const winston_1 = __importDefault(require("winston"));
// Logger configuration
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: 'nextgen-deduplication' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
/**
 * Check if a lead is a premium listing (ad record)
 */
function isPremiumListing(lead) {
    return lead.product === 'ad';
}
/**
 * Check if a lead is a main data record
 */
function isMainDataRecord(lead) {
    return lead.product === 'data';
}
/**
 * Get deduplication key for a lead
 * Priority: leadId > nextgenId > phone > email
 */
function getDeduplicationKey(lead) {
    return lead.leadId || lead.nextgenId || lead.phone || lead.email || null;
}
/**
 * Format premium listing note for lead
 */
function formatPremiumListingNote(priceBreakdown) {
    return `💎 Premium Listing Applied:\n` +
        `Base Price: $${priceBreakdown.base}\n` +
        `Premium Listing: $${priceBreakdown.premium}\n` +
        `Total Price: $${priceBreakdown.total}`;
}
/**
 * Process a NextGen lead with deduplication and premium merge logic
 *
 * @param incomingLead - The lead data from webhook or CSV
 * @param existingLead - Existing lead from database (if found)
 * @returns Processing result with action to take
 */
function processNextGenLead(incomingLead, existingLead) {
    const incomingPrice = parseFloat(incomingLead.price) || 0;
    const existingPrice = existingLead ? (parseFloat(existingLead.price) || 0) : 0;
    // Case 1: No existing lead - create new
    if (!existingLead) {
        logger.info('Creating new NextGen lead', {
            leadId: getDeduplicationKey(incomingLead),
            product: incomingLead.product,
            price: incomingPrice
        });
        return {
            action: 'create',
            leadData: incomingLead,
            logMessage: `New ${incomingLead.product || 'unknown'} lead created with price $${incomingPrice}`
        };
    }
    // Case 2: Premium listing for existing lead - merge prices
    if (isPremiumListing(incomingLead)) {
        const totalPrice = existingPrice + incomingPrice;
        const priceBreakdown = {
            base: existingPrice,
            premium: incomingPrice,
            total: totalPrice
        };
        // Preserve existing lead data, only update price and notes
        const updatedLead = {
            ...existingLead,
            price: totalPrice,
            // Append premium note to existing notes
            notes: existingLead.notes
                ? existingLead.notes + '\n\n' + formatPremiumListingNote(priceBreakdown)
                : formatPremiumListingNote(priceBreakdown)
        };
        logger.info('Merging premium listing with existing lead', {
            leadId: getDeduplicationKey(incomingLead),
            existingPrice,
            premiumPrice: incomingPrice,
            totalPrice
        });
        return {
            action: 'update',
            leadData: updatedLead,
            notes: formatPremiumListingNote(priceBreakdown),
            priceBreakdown,
            logMessage: `Premium listing merged: +$${incomingPrice} = $${totalPrice} total`
        };
    }
    // Case 3: Main data record for existing premium listing - replace but keep premium price
    if (isMainDataRecord(incomingLead) && isPremiumListing(existingLead)) {
        const totalPrice = incomingPrice + existingPrice;
        const priceBreakdown = {
            base: incomingPrice,
            premium: existingPrice,
            total: totalPrice
        };
        // Use incoming main data but add the premium price
        const updatedLead = {
            ...incomingLead,
            price: totalPrice,
            notes: formatPremiumListingNote(priceBreakdown)
        };
        logger.info('Replacing premium listing with main data record', {
            leadId: getDeduplicationKey(incomingLead),
            basePrice: incomingPrice,
            premiumPrice: existingPrice,
            totalPrice
        });
        return {
            action: 'update',
            leadData: updatedLead,
            notes: formatPremiumListingNote(priceBreakdown),
            priceBreakdown,
            logMessage: `Main data record replaced premium: base $${incomingPrice} + premium $${existingPrice} = $${totalPrice}`
        };
    }
    // Case 4: Duplicate main records or other scenarios - update with latest data
    logger.warn('Duplicate NextGen record detected', {
        leadId: getDeduplicationKey(incomingLead),
        existingProduct: existingLead.product,
        incomingProduct: incomingLead.product,
        existingPrice,
        incomingPrice
    });
    // For duplicate main records, we could either:
    // Option A: Keep existing and skip
    // Option B: Update with latest data
    // Option C: Sum prices (current CSV behavior)
    // Going with Option B: Update with latest data but log warning
    return {
        action: 'update',
        leadData: {
            ...incomingLead,
            notes: (existingLead.notes || '') +
                `\n\n⚠️ Duplicate ${incomingLead.product || 'unknown'} record processed. ` +
                `Previous price: $${existingPrice}, New price: $${incomingPrice}`
        },
        logMessage: `Duplicate ${incomingLead.product || 'unknown'} record: updating with latest data`
    };
}
/**
 * Process multiple NextGen leads for batch operations (like CSV import)
 * Handles deduplication within the batch
 */
function processNextGenBatch(leads) {
    const dedupMap = new Map();
    let premiumListingCount = 0;
    for (const lead of leads) {
        const key = getDeduplicationKey(lead);
        if (!key) {
            // No deduplication key, include as-is
            dedupMap.set(Math.random().toString(), lead);
            continue;
        }
        const existing = dedupMap.get(key);
        const result = processNextGenLead(lead, existing);
        if (result.action === 'create' || result.action === 'update') {
            dedupMap.set(key, result.leadData);
            if (isPremiumListing(lead) && existing) {
                premiumListingCount++;
            }
        }
        if (result.logMessage) {
            logger.info(`[Batch] ${result.logMessage}`);
        }
    }
    if (premiumListingCount > 0) {
        logger.info(`[Batch] Processed ${premiumListingCount} premium listings`);
    }
    return Array.from(dedupMap.values());
}
