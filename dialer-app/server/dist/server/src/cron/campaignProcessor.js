"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.job = void 0;
exports.startCampaignProcessor = startCampaignProcessor;
exports.stopCampaignProcessor = stopCampaignProcessor;
const cron_1 = require("cron");
const campaignScheduler_1 = require("../services/campaignScheduler");
// Create a cron job that runs every 5 minutes
// Cron format: Seconds Minutes Hours DayOfMonth Month DayOfWeek
const campaignProcessorJob = new cron_1.CronJob('0 */5 * * * *', // Run every 5 minutes
async function () {
    console.log('Running campaign processor job...');
    try {
        await (0, campaignScheduler_1.processCampaigns)();
    }
    catch (error) {
        console.error('Error running campaign processor job:', error);
    }
}, null, // onComplete
false, // start
'UTC' // timezone
);
function startCampaignProcessor() {
    console.log('Starting campaign processor job...');
    campaignProcessorJob.start();
}
function stopCampaignProcessor() {
    console.log('Stopping campaign processor job...');
    campaignProcessorJob.stop();
}
// Export the job for testing or manual triggering
exports.job = campaignProcessorJob;
