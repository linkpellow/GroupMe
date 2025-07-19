import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'nextgen-deduplication' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/**
 * Result of NextGen lead deduplication processing
 */
export interface NextGenDeduplicationResult {
  action: 'create' | 'update' | 'skip';
  leadData: any;
  notes?: string;
  priceBreakdown?: {
    base: number;
    premium: number;
    total: number;
  };
  logMessage?: string;
}

/**
 * Check if a lead is a premium listing (ad record)
 */
export function isPremiumListing(lead: any): boolean {
  return lead.product === 'ad';
}

/**
 * Check if a lead is a main data record
 */
export function isMainDataRecord(lead: any): boolean {
  return lead.product === 'data';
}

/**
 * Get deduplication key for a lead
 * Priority: leadId > nextgenId > phone > email
 */
export function getDeduplicationKey(lead: any): string | null {
  return lead.leadId || lead.nextgenId || lead.phone || lead.email || null;
}

/**
 * Format premium listing note for lead
 */
export function formatPremiumListingNote(priceBreakdown: { base: number; premium: number; total: number }): string {
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
export function processNextGenLead(
  incomingLead: any,
  existingLead?: any
): NextGenDeduplicationResult {
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
export function processNextGenBatch(leads: any[]): any[] {
  const dedupMap = new Map<string, any>();
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