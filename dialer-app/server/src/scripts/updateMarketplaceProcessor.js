// Script to update the marketplace processor to handle duplicate leads properly
const fs = require("fs");
const path = require("path");

// Path to the file we need to modify
const processorPath = path.join(
  __dirname,
  "../services/marketplaceLeadsProcessor.ts",
);

// Start the update process
async function updateProcessor() {
  try {
    console.log(`Reading processor file: ${processorPath}`);

    // Read the existing file
    let content = fs.readFileSync(processorPath, "utf8");

    // Check if our fix is already applied
    if (
      content.includes("catch (createError) {") &&
      content.includes("// Handle duplicate key errors") &&
      content.includes("E11000 duplicate key")
    ) {
      console.log(
        "File already contains duplicate key error handling. No changes needed.",
      );
      return;
    }

    console.log("Adding duplicate key error handling to processor...");

    // Find the lead creation code
    const createLeadPattern =
      /console\.log\('Creating lead with data:'[^\n]*\n\s*const lead = await LeadModel\.create\(leadData\);/;

    // Replacement with additional error handling for duplicate keys
    const replacementCode = `console.log('Creating lead with data:', JSON.stringify(leadData, null, 2));
        
        // First check if a lead with this email already exists using findOne instead of relying on index
        if (leadData.email) {
          const existingLead = await LeadModel.findOne({ email: leadData.email });
          if (existingLead) {
            console.log(\`Lead with email \${leadData.email} already exists (id: \${existingLead._id}), skipping creation\`);
            
            // Mark the email as processed even though we didn't create a new lead
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: message.id || '',
                requestBody: {
                  addLabelIds: [processedLabelId],
                  removeLabelIds: ['UNREAD']
                }
              });
            } catch (labelError) {
              // If we can't mark the email as processed due to permission issues,
              // log the error but don't count it as a failure since we've already handled the lead
              console.warn(\`Warning: Could not mark duplicate email \${message.id} as processed due to: \${labelError.message}\`);
              console.warn('You may need to reconnect Gmail with additional permissions');
            }
            
            successCount++;
            continue;
          }
        }
        
        // Create the lead with error handling for duplicate key errors
        let lead;
        try {
          lead = await LeadModel.create(leadData);
        } catch (createError) {
          // Handle duplicate key errors (E11000) gracefully
          if (createError.message && createError.message.includes('E11000 duplicate key')) {
            console.log(\`Duplicate lead detected for email: \${leadData.email}, skipping creation\`);
            
            // Mark the email as processed even though we couldn't create the lead due to duplicate
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: message.id || '',
                requestBody: {
                  addLabelIds: [processedLabelId],
                  removeLabelIds: ['UNREAD']
                }
              });
            } catch (labelError) {
              console.warn(\`Warning: Could not mark duplicate email \${message.id} as processed due to: \${labelError.message}\`);
            }
            
            // Count as success since we've properly handled the duplicate
            successCount++;
            continue;
          } else {
            // For other errors, rethrow
            throw createError;
          }
        }`;

    // Apply the replacement
    content = content.replace(createLeadPattern, replacementCode);

    // Write the updated content back to the file
    fs.writeFileSync(processorPath, content, "utf8");

    console.log(
      "Successfully updated marketplaceLeadsProcessor.ts with duplicate handling!",
    );
    console.log("Changes made:");
    console.log(
      "1. Added check for existing leads by email before trying to create new ones",
    );
    console.log(
      "2. Added error handling for duplicate key errors during lead creation",
    );
    console.log("3. Ensured duplicate leads are properly logged and skipped");

    console.log(
      "\nThe server will now properly handle duplicate marketplace leads.",
    );
  } catch (error) {
    console.error("Error updating processor file:", error);
  }
}

// Run the update
updateProcessor()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
